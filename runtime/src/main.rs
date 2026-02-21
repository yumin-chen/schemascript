use anyhow::Result;
use artefact_runtime::onnx_engine::{OnnxEngine, OnnxPayload};
use artefact_runtime::{AsyncDatabase, QueryPayload};
use rquickjs::{Context, Function, Object, Runtime};
use std::sync::Arc;

fn main() -> Result<()> {
    smol::block_on(async {
        // Use async database initialization with connection pooling
        let db = AsyncDatabase::new("artefact.db").await?;
        let db = Arc::new(db);

        let onnx = Arc::new(OnnxEngine::new()?);

        let runtime = Runtime::new()?;
        let context = Context::full(&runtime)?;

        context.with(|ctx| {
            let global = ctx.globals();

            // Inject console.log
            let console = Object::new(ctx.clone())?;
            console.set(
                "log",
                Function::new(ctx.clone(), |s: String| {
                    println!("[JS LOG] {}", s);
                })?,
            )?;
            global.set("console", console)?;

            // Inject __host_sqlite_call (async-aware but synchronous for rquickjs compatibility)
            let db_clone = Arc::clone(&db);
            let query_fn = Function::new(ctx.clone(), move |payload_str: String| -> String {
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
            global.set("__host_sqlite_call", query_fn)?;

            // Inject __host_onnx_call
            let onnx_clone = Arc::clone(&onnx);
            let onnx_fn = Function::new(ctx.clone(), move |payload_str: String| -> String {
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
            global.set("__host_onnx_call", onnx_fn)?;

            Ok::<(), anyhow::Error>(())
        })?;

        // Example JS code execution
        context.with(|ctx| {
            let code = std::env::args().nth(1).unwrap_or_else(|| {
                r#"
            console.log("Starting Artefact Sandbox...");
            
            const createTable = __host_sqlite_call(JSON.stringify({
                sql: "CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY, name TEXT, data BLOB)",
                params: [],
                method: "run"
            }));
            console.log("Setup: " + createTable);

            const insert = __host_sqlite_call(JSON.stringify({
                sql: "INSERT INTO items (name) VALUES (?)",
                params: ["Artefact Prototype"],
                method: "run"
            }));
            console.log("Insert: " + insert);

            const query = __host_sqlite_call(JSON.stringify({
                sql: "SELECT * FROM items",
                params: [],
                method: "all"
            }));
            console.log("All Items: " + query);

            // ONNX Example
            console.log("Testing ONNX Bridge...");
            const onnxResult = __host_onnx_call(JSON.stringify({
                model_path: "test.onnx",
                inputs: {
                    "input": { type: "float", data: [1, 2, 3, 4], shape: [1, 4] }
                }
            }));
            console.log("ONNX Result: " + onnxResult);
        "#.to_string()
            });

            let result = if code.ends_with(".js") {
                let code_content = std::fs::read_to_string(&code).expect("Failed to read JS file");
                ctx.eval::<(), _>(code_content)
            } else {
                ctx.eval::<(), _>(code)
            };

            if let Err(e) = result {
                eprintln!("JS Execution Error: {:?}", e);
            }
        });

        Ok(())
    })
}
