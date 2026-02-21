use crate::{AsyncDatabase, QueryPayload};
use rquickjs::{Context, Function, Runtime};
use std::sync::Arc;

pub struct JsHost {
    runtime: Runtime,
    context: Context,
    db: Arc<AsyncDatabase>,
}

impl JsHost {
    pub fn new(db: Arc<AsyncDatabase>) -> anyhow::Result<Self> {
        let runtime = Runtime::new()?;
        let context = Context::full(&runtime)?;

        let db_clone = db.clone();

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

            Ok::<(), anyhow::Error>(())
        })?;

        Ok(Self {
            runtime,
            context,
            db,
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
