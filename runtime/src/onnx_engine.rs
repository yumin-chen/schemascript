use anyhow::{anyhow, Result};
use ndarray::ArrayD;
use ort::session::{Session, SessionInputs};
use ort::value::Value;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

#[derive(Deserialize, Debug)]
#[serde(tag = "type")]
pub enum OnnxTensor {
    #[serde(rename = "float")]
    Float {
        data: Vec<f32>,
        shape: Vec<usize>,
    },
    #[serde(rename = "int64")]
    Int64 {
        data: Vec<i64>,
        shape: Vec<usize>,
    },
}

#[derive(Deserialize, Debug)]
pub struct OnnxPayload {
    pub model_path: String,
    pub inputs: HashMap<String, OnnxTensor>,
}

#[derive(Serialize, Debug)]
pub struct OnnxResult {
    pub outputs: HashMap<String, OnnxOutputTensor>,
    pub error: Option<String>,
}

#[derive(Serialize, Debug)]
pub struct OnnxOutputTensor {
    pub data: JsonValue,
    pub shape: Vec<usize>,
}

pub struct OnnxEngine {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
    base_path: PathBuf,
}

impl OnnxEngine {
    pub fn new() -> Result<Self> {
        Ok(Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            base_path: PathBuf::from("models"),
        })
    }

    fn validate_path(&self, model_path: &str) -> Result<PathBuf> {
        let path = Path::new(model_path);

        if path.is_absolute() || path.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
             return Err(anyhow!("Invalid model path: {}", model_path));
        }

        let full_path = self.base_path.join(path);
        if !full_path.exists() {
            return Err(anyhow!("Model file not found: {}", full_path.display()));
        }

        Ok(full_path)
    }

    pub fn execute(&self, payload: OnnxPayload) -> Result<OnnxResult> {
        let mut inputs = Vec::new();
        for (name, tensor) in payload.inputs {
            match tensor {
                OnnxTensor::Float { data, shape } => {
                    let array = ArrayD::from_shape_vec(shape, data)
                        .map_err(|e| anyhow!("Invalid shape: {}", e))?;
                    inputs.push((name, Value::from_array(array)?.into_dyn()));
                }
                OnnxTensor::Int64 { data, shape } => {
                    let array = ArrayD::from_shape_vec(shape, data)
                        .map_err(|e| anyhow!("Invalid shape: {}", e))?;
                    inputs.push((name, Value::from_array(array)?.into_dyn()));
                }
            }
        }

        let mut sessions = self.sessions.lock().unwrap();

        if !sessions.contains_key(&payload.model_path) {
            match self.validate_path(&payload.model_path) {
                Ok(full_path) => {
                    let session = Session::builder()?.commit_from_file(full_path)?;
                    sessions.insert(payload.model_path.clone(), session);
                }
                Err(e) => {
                    return Ok(OnnxResult {
                        outputs: HashMap::new(),
                        error: Some(e.to_string()),
                    });
                }
            }
        }

        let session = sessions.get_mut(&payload.model_path).unwrap();
        let outputs = session.run(SessionInputs::from(inputs))?;
        let mut result_outputs = HashMap::new();

        for (name, value) in outputs {
            if let Ok((shape, data)) = value.try_extract_tensor::<f32>() {
                let shape_vec = shape.to_vec().into_iter().map(|v| v as usize).collect();
                let data_val = serde_json::to_value(data)?;
                result_outputs.insert(name.to_string(), OnnxOutputTensor { data: data_val, shape: shape_vec });
            } else if let Ok((shape, data)) = value.try_extract_tensor::<i64>() {
                let shape_vec = shape.to_vec().into_iter().map(|v| v as usize).collect();
                let data_val = serde_json::to_value(data)?;
                result_outputs.insert(name.to_string(), OnnxOutputTensor { data: data_val, shape: shape_vec });
            }
        }

        Ok(OnnxResult {
            outputs: result_outputs,
            error: None,
        })
    }
}
