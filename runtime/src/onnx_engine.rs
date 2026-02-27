use ort::{
    execution_providers::{CPUExecutionProvider, CoreMLExecutionProvider, CUDAExecutionProvider},
    session::Session,
};
use std::path::Path;
use tokenizers::Tokenizer;
use sysinfo::System;
use anyhow::Result;

#[derive(Debug, Clone, Copy)]
pub enum ModelTask {
    Chat,
    Predict,
    Categorise,
}

pub enum RAMTier {
    Micro,  // < 1GB
    Small,  // < 2GB
    Medium, // < 4GB
    Large,  // < 8GB
    Macro,  // < 14GB
}

impl RAMTier {
    pub fn detect() -> Self {
        let mut sys = System::new_all();
        sys.refresh_memory();
        let total_ram_gb = sys.total_memory() / 1024 / 1024 / 1024;

        if total_ram_gb < 1 {
            RAMTier::Micro
        } else if total_ram_gb < 2 {
            RAMTier::Small
        } else if total_ram_gb < 4 {
            RAMTier::Medium
        } else if total_ram_gb < 8 {
            RAMTier::Large
        } else {
            RAMTier::Macro
        }
    }
}

pub struct OnnxEngine {
    chat_session: Option<Session>,
    predict_session: Option<Session>,
    embedding_session: Session,
    tokenizer: Tokenizer,
}

impl OnnxEngine {
    pub fn new() -> Result<Self> {
        let tier = RAMTier::detect();

        // Model selection strategy:
        // - For structured JSON (Predict/Categorise), we prefer Qwen2 models across tiers
        //   as they are specifically trained/fine-tuned for instruction following and JSON output.
        // - For Chat, we can use slightly more 'creative' or balanced models like TinyLlama or Phi-3.

        let (chat_model_path, predict_model_path, embed_model_path) = match tier {
            RAMTier::Micro => (
                "models/qwen2-0.5b.onnx", // Share for micro
                "models/qwen2-0.5b.onnx",
                "models/all-MiniLM-L6-v2.onnx"
            ),
            RAMTier::Small => (
                "models/tinyllama-1.1b.onnx",
                "models/qwen2-1.5b.onnx", // Qwen2 is better for structured tasks
                "models/bge-small-en.onnx"
            ),
            RAMTier::Medium => (
                "models/phi-3-mini.onnx",
                "models/qwen2-7b.onnx",
                "models/bge-base-en.onnx"
            ),
            RAMTier::Large => (
                "models/mistral-7b.onnx",
                "models/qwen2-7b.onnx",
                "models/bge-large-en.onnx"
            ),
            RAMTier::Macro => (
                "models/llama-3-8b.onnx",
                "models/qwen2-7b.onnx",
                "models/bge-large-en.onnx"
            ),
        };

        let chat_session = Self::create_session(chat_model_path).ok();
        let predict_session = if predict_model_path == chat_model_path {
            None // Reuse chat session or handle as None to avoid double load if same
        } else {
            Self::create_session(predict_model_path).ok()
        };

        let embedding_session = Self::create_session(embed_model_path)?;

        // Load tokenizer (assuming it's next to the model)
        let tokenizer = Tokenizer::from_file("models/tokenizer.json")
            .map_err(|e| anyhow::anyhow!("Failed to load tokenizer: {}", e))?;

        Ok(Self {
            chat_session,
            predict_session,
            embedding_session,
            tokenizer,
        })
    }

    pub fn run_inference(&self, _prompt: &str, task: ModelTask) -> Result<String> {
        let _session = match task {
            ModelTask::Chat => self.chat_session.as_ref().or(self.predict_session.as_ref()),
            ModelTask::Predict | ModelTask::Categorise => self.predict_session.as_ref().or(self.chat_session.as_ref()),
        }.ok_or_else(|| anyhow::anyhow!("No session available for task {:?}", task))?;

        // Simplified placeholder for tokenization and inference
        Ok(format!("Generated response for {:?} task", task))
    }

    pub fn run_embedding(&self, _text: &str) -> Result<Vec<f32>> {
        Ok(vec![0.0; 384]) // Placeholder
    }

    fn create_session<P: AsRef<Path>>(path: P) -> Result<Session> {
        let builder = Session::builder()?;

        let builder = builder.with_execution_providers([
            CUDAExecutionProvider::default().build(),
            CoreMLExecutionProvider::default().build(),
            CPUExecutionProvider::default().build(),
        ])?;

        let session = builder.commit_from_file(path)?;
        Ok(session)
    }
}
