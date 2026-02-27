use crate::chat::ChatManager;
use crate::{AsyncDatabase, QueryPayload};
use rquickjs::{Context, Function, Object, Runtime};
use std::sync::Arc;

pub struct JsHost {
    runtime: Runtime,
    context: Context,
    db: Arc<AsyncDatabase>,
    chat: Arc<ChatManager>,
}

impl JsHost {
    pub fn new(db: Arc<AsyncDatabase>, chat: Arc<ChatManager>) -> anyhow::Result<Self> {
        let runtime = Runtime::new()?;
        let context = Context::full(&runtime)?;

        let db_clone = db.clone();
        let chat_clone = chat.clone();

        context.with(|ctx| {
            let globals = ctx.globals();

            let host_call = Function::new(ctx.clone(), move |payload_str: String| -> String {
                let payload: QueryPayload = match serde_json::from_str(&payload_str) {
                    Ok(p) => p,
                    Err(e) => return format!("{{\"error\": \"Invalid payload: {}\"}}", e),
                };
                match smol::block_on(db_clone.execute(payload)) {
                    Ok(result) => serde_json::to_string(&result).unwrap_or_else(|e| {
                        format!("{{\"error\": \"Serialisation error: {}\"}}", e)
                    }),
                    Err(e) => format!("{{\"error\": \"DB error: {}\"}}", e),
                }
            })?;

            globals.set("__host_sqlite_call", host_call)?;

            let chat_manager_for_predict = chat_clone.clone();
            let predict_call = Function::new(ctx.clone(), move |content: String, schema: String| -> String {
                match chat_manager_for_predict.predict(content, schema) {
                    Ok(res) => res,
                    Err(e) => format!("{{\"error\": \"Predict error: {}\"}}", e),
                }
            })?;
            globals.set("__host_predict_call", predict_call.clone())?;

            let chat_manager_for_categorise = chat_clone.clone();
            let categorise_call = Function::new(ctx.clone(), move |content: String, choices: Vec<String>| -> String {
                match chat_manager_for_categorise.categorise(content, choices) {
                    Ok(res) => res,
                    Err(e) => format!("{{\"error\": \"Categorise error: {}\"}}", e),
                }
            })?;
            globals.set("__host_categorise_call", categorise_call.clone())?;

            let chat_obj = Object::new(ctx.clone())?;
            let chat_manager = chat_clone.clone();
            chat_obj.set(
                "sendMessage",
                Function::new(
                    ctx.clone(),
                    move |content: String, session_id: Option<String>| -> String {
                        match chat_manager.send_message(content, session_id) {
                            Ok(res) => res,
                            Err(e) => format!("Error: {}", e),
                        }
                    },
                )?,
            )?;

            chat_obj.set("predict", predict_call)?;
            chat_obj.set("categorise", categorise_call)?;

            globals.set("chat", chat_obj)?;

            Ok::<(), anyhow::Error>(())
        })?;

        Ok(Self {
            runtime,
            context,
            db,
            chat,
        })
    }

    pub fn eval<R>(&self, code: &str) -> anyhow::Result<R>
    where
        R: for<'js> rquickjs::FromJs<'js>,
    {
        self.context.with(|ctx| {
            let res = ctx.eval::<R, _>(code)?;
            Ok(res)
        })
    }
}
