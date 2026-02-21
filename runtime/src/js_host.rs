use crate::onnx_engine::{OnnxEngine, OnnxPayload};
use crate::{AsyncDatabase, QueryPayload};
use rquickjs::{Context, Function, Runtime};
use std::sync::Arc;

pub struct JsHost {
    runtime: Runtime,
    context: Context,
    db: Arc<AsyncDatabase>,
    onnx: Arc<OnnxEngine>,
}

impl JsHost {
    pub fn new(db: Arc<AsyncDatabase>, onnx: Arc<OnnxEngine>) -> anyhow::Result<Self> {
        let runtime = Runtime::new()?;
        let context = Context::full(&runtime)?;

        let db_clone = db.clone();
        let onnx_clone = onnx.clone();

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

            let onnx_call = Function::new(ctx.clone(), move |payload_str: String| -> String {
                let payload: OnnxPayload = match serde_json::from_str(&payload_str) {
                    Ok(p) => p,
                    Err(e) => return format!("{{\"error\": \"Invalid ONNX payload: {}\"}}", e),
                };
                match onnx_clone.execute(payload) {
                    Ok(result) => serde_json::to_string(&result).unwrap_or_else(|e| {
                        format!("{{\"error\": \"Serialisation error: {}\"}}", e)
                    }),
                    Err(e) => format!("{{\"error\": \"ONNX error: {}\"}}", e),
                }
            })?;

            globals.set("__host_onnx_call", onnx_call)?;

            Ok::<(), anyhow::Error>(())
        })?;

        Ok(Self {
            runtime,
            context,
            db,
            onnx,
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
