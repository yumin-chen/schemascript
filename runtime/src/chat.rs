use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use crate::onnx_engine::{OnnxEngine, ModelTask};
use std::sync::{Arc, Mutex};

#[derive(Serialize, Deserialize, Clone)]
pub struct Message {
    pub role: String,
    pub content: String,
}

pub struct ChatSession {
    pub history: Vec<Message>,
}

pub struct ChatManager {
    engine: Arc<OnnxEngine>,
    db: Arc<crate::AsyncDatabase>,
    sessions: Mutex<HashMap<String, ChatSession>>,
    global_session: Mutex<ChatSession>,
}

impl ChatManager {
    pub fn new(engine: Arc<OnnxEngine>, db: Arc<crate::AsyncDatabase>) -> Self {
        // Initialize memory table
        smol::block_on(db.execute(crate::QueryPayload {
            sql: "CREATE TABLE IF NOT EXISTS chat_memory (id INTEGER PRIMARY KEY, session_id TEXT, content TEXT, embedding BLOB)".to_string(),
            params: vec![],
            method: "run".to_string(),
        })).ok();

        Self {
            engine,
            db,
            sessions: Mutex::new(HashMap::new()),
            global_session: Mutex::new(ChatSession { history: Vec::new() }),
        }
    }

    pub fn send_message(&self, content: String, session_id: Option<String>) -> anyhow::Result<String> {
        let user_message = Message {
            role: "user".to_string(),
            content: content.clone(),
        };

        // 1. Retrieve history and update it
        let history = if let Some(ref id) = session_id {
            let mut sessions = self.sessions.lock().unwrap();
            let session = sessions.entry(id.clone()).or_insert(ChatSession { history: Vec::new() });
            session.history.push(user_message);
            session.history.clone()
        } else {
            let mut global = self.global_session.lock().unwrap();
            global.history.push(user_message);
            global.history.clone()
        };

        // 2. Retrieval from memory (placeholder for now)
        let _context = self.retrieve_context(&content, session_id.as_deref())?;

        // 3. Format prompt
        let prompt = history.iter()
            .map(|m| format!("{}: {}", m.role, m.content))
            .collect::<Vec<_>>()
            .join("\n");

        // 4. Run inference
        let response_content = self.engine.run_inference(&prompt, ModelTask::Chat)?;

        let assistant_message = Message {
            role: "assistant".to_string(),
            content: response_content.clone(),
        };

        // 5. Update history with assistant message
        if let Some(ref id) = session_id {
            let mut sessions = self.sessions.lock().unwrap();
            if let Some(session) = sessions.get_mut(id) {
                session.history.push(assistant_message);
            }
        } else {
            let mut global = self.global_session.lock().unwrap();
            global.history.push(assistant_message);
        }

        Ok(response_content)
    }

    pub fn predict(&self, content: String, schema: String) -> anyhow::Result<String> {
        let prompt = format!(
            "Task: Generate structured JSON output based on the provided schema.\n\nInput: {}\n\nSchema: {}\n\nJSON Output:",
            content, schema
        );

        let response = self.engine.run_inference(&prompt, ModelTask::Predict)?;
        Ok(response)
    }

    pub fn categorise(&self, content: String, choices: Vec<String>) -> anyhow::Result<String> {
        let prompt = format!(
            "Task: Categorize the input into one of the following choices: {}\n\nInput: {}\n\nChoice:",
            choices.join(", "), content
        );

        let response = self.engine.run_inference(&prompt, ModelTask::Categorise)?;
        Ok(response)
    }

    fn retrieve_context(&self, query: &str, session_id: Option<&str>) -> anyhow::Result<String> {
        let _embedding = self.engine.run_embedding(query)?;

        let result = smol::block_on(self.db.execute(crate::QueryPayload {
            sql: "SELECT content FROM chat_memory WHERE session_id = ? LIMIT 3".to_string(),
            params: vec![serde_json::json!(session_id.unwrap_or("global"))],
            method: "all".to_string(),
        }))?;

        if let Some(rows) = result.rows {
            let context = rows.iter()
                .filter_map(|row| row.get(0).and_then(|v| v.as_str()))
                .collect::<Vec<_>>()
                .join("\n---\n");
            Ok(context)
        } else {
            Ok(String::new())
        }
    }

    pub fn store_memory(&self, content: &str, session_id: Option<&str>) -> anyhow::Result<()> {
        let embedding = self.engine.run_embedding(content)?;
        let embedding_json = serde_json::json!(embedding);

        smol::block_on(self.db.execute(crate::QueryPayload {
            sql: "INSERT INTO chat_memory (session_id, content, embedding) VALUES (?, ?, ?)".to_string(),
            params: vec![
                serde_json::json!(session_id.unwrap_or("global")),
                serde_json::json!(content),
                embedding_json,
            ],
            method: "run".to_string(),
        }))?;

        Ok(())
    }
}
