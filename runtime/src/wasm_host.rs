use crate::chat::ChatManager;
use crate::{AsyncDatabase, QueryPayload};
use anyhow::Result;
use std::sync::{Arc, Mutex};
use wasmedge_sdk::{
    config::{ConfigBuilder, HostRegistrationConfigOptions},
    plugin::PluginManager,
    CallingFrame, ImportObjectBuilder, VmBuilder, WasmEdgeResult, WasmValue,
};

pub struct HostState {
    pub db: Arc<AsyncDatabase>,
    pub chat: Arc<ChatManager>,
    pub last_result: Vec<u8>,
}

/// Real Implementation: host_db_query
fn host_db_query(
    frame: CallingFrame,
    inputs: Vec<WasmValue>,
    data: &mut Arc<Mutex<HostState>>,
) -> WasmEdgeResult<Vec<WasmValue>> {
    let ptr = inputs[0].to_i32() as u32;
    let len = inputs[1].to_i32() as u32;

    let mem = frame
        .memory(0)
        .ok_or(wasmedge_sdk::error::WasmEdgeError::Vm(
            wasmedge_sdk::error::VmError::ExecuteFailed,
        ))?;
    let payload_bytes = mem.read(ptr, len).map_err(|_| {
        wasmedge_sdk::error::WasmEdgeError::Vm(wasmedge_sdk::error::VmError::ExecuteFailed)
    })?;

    let payload: QueryPayload = match serde_json::from_slice(&payload_bytes) {
        Ok(p) => p,
        Err(e) => {
            let mut state = data.lock().unwrap();
            state.last_result =
                format!("{{\"error\": \"Host Deserialisation Error: {}\"}}", e).into_bytes();
            return Ok(vec![WasmValue::from_i32(state.last_result.len() as i32)]);
        }
    };

    let db = {
        let state = data.lock().unwrap();
        Arc::clone(&state.db)
    };

    let result = match smol::block_on(db.execute(payload)) {
        Ok(r) => r,
        Err(e) => crate::QueryResult {
            rows: None,
            last_insert_row_id: None,
            changes: None,
            error: Some(e.to_string()),
        },
    };

    let serialised = serde_json::to_vec(&result)
        .unwrap_or_else(|_| b"{\"error\": \"Result Serialisation Error\"}".to_vec());
    let result_len = serialised.len() as i32;

    {
        let mut state = data.lock().unwrap();
        state.last_result = serialised;
    }

    Ok(vec![WasmValue::from_i32(result_len)])
}

/// Real Implementation: host_copy_result
fn host_copy_result(
    frame: CallingFrame,
    inputs: Vec<WasmValue>,
    data: &mut Arc<Mutex<HostState>>,
) -> WasmEdgeResult<Vec<WasmValue>> {
    let ptr = inputs[0].to_i32() as u32;
    let max_len = inputs[1].to_i32() as u32;

    let mem = frame
        .memory(0)
        .ok_or(wasmedge_sdk::error::WasmEdgeError::Vm(
            wasmedge_sdk::error::VmError::ExecuteFailed,
        ))?;

    let state = data.lock().unwrap();
    let to_copy = if state.last_result.len() > max_len as usize {
        &state.last_result[..max_len as usize]
    } else {
        &state.last_result
    };

    if let Err(_) = mem.write(to_copy, ptr) {
        return Ok(vec![WasmValue::from_i32(-1)]);
    }

    Ok(vec![WasmValue::from_i32(to_copy.len() as i32)])
}

/// Real Implementation: host_chat_send_message
fn host_chat_send_message(
    frame: CallingFrame,
    inputs: Vec<WasmValue>,
    data: &mut Arc<Mutex<HostState>>,
) -> WasmEdgeResult<Vec<WasmValue>> {
    let content_ptr = inputs[0].to_i32() as u32;
    let content_len = inputs[1].to_i32() as u32;
    let session_ptr = inputs[2].to_i32() as u32;
    let session_len = inputs[3].to_i32() as u32;

    let mem = frame
        .memory(0)
        .ok_or(wasmedge_sdk::error::WasmEdgeError::Vm(
            wasmedge_sdk::error::VmError::ExecuteFailed,
        ))?;

    let content = String::from_utf8_lossy(
        &mem.read(content_ptr, content_len).map_err(|_| {
            wasmedge_sdk::error::WasmEdgeError::Vm(wasmedge_sdk::error::VmError::ExecuteFailed)
        })?,
    )
    .to_string();

    let session_id = if session_len > 0 {
        Some(
            String::from_utf8_lossy(&mem.read(session_ptr, session_len).map_err(|_| {
                wasmedge_sdk::error::WasmEdgeError::Vm(wasmedge_sdk::error::VmError::ExecuteFailed)
            })?)
            .to_string(),
        )
    } else {
        None
    };

    let chat = {
        let state = data.lock().unwrap();
        Arc::clone(&state.chat)
    };

    let result = match chat.send_message(content, session_id) {
        Ok(r) => r,
        Err(e) => format!("Error: {}", e),
    };

    let serialised = result.into_bytes();
    let result_len = serialised.len() as i32;

    {
        let mut state = data.lock().unwrap();
        state.last_result = serialised;
    }

    Ok(vec![WasmValue::from_i32(result_len)])
}

/// Real Implementation: host_predict_call
fn host_predict_call(
    frame: CallingFrame,
    inputs: Vec<WasmValue>,
    data: &mut Arc<Mutex<HostState>>,
) -> WasmEdgeResult<Vec<WasmValue>> {
    let content_ptr = inputs[0].to_i32() as u32;
    let content_len = inputs[1].to_i32() as u32;
    let schema_ptr = inputs[2].to_i32() as u32;
    let schema_len = inputs[3].to_i32() as u32;

    let mem = frame
        .memory(0)
        .ok_or(wasmedge_sdk::error::WasmEdgeError::Vm(
            wasmedge_sdk::error::VmError::ExecuteFailed,
        ))?;

    let content = String::from_utf8_lossy(
        &mem.read(content_ptr, content_len).map_err(|_| {
            wasmedge_sdk::error::WasmEdgeError::Vm(wasmedge_sdk::error::VmError::ExecuteFailed)
        })?,
    )
    .to_string();

    let schema = String::from_utf8_lossy(
        &mem.read(schema_ptr, schema_len).map_err(|_| {
            wasmedge_sdk::error::WasmEdgeError::Vm(wasmedge_sdk::error::VmError::ExecuteFailed)
        })?,
    )
    .to_string();

    let chat = {
        let state = data.lock().unwrap();
        Arc::clone(&state.chat)
    };

    let result = match chat.predict(content, schema) {
        Ok(r) => r,
        Err(e) => format!("{{\"error\": \"Predict Error: {}\"}}", e),
    };

    let serialised = result.into_bytes();
    let result_len = serialised.len() as i32;

    {
        let mut state = data.lock().unwrap();
        state.last_result = serialised;
    }

    Ok(vec![WasmValue::from_i32(result_len)])
}

/// Real Implementation: host_categorise_call
fn host_categorise_call(
    frame: CallingFrame,
    inputs: Vec<WasmValue>,
    data: &mut Arc<Mutex<HostState>>,
) -> WasmEdgeResult<Vec<WasmValue>> {
    let content_ptr = inputs[0].to_i32() as u32;
    let content_len = inputs[1].to_i32() as u32;
    let choices_ptr = inputs[2].to_i32() as u32;
    let choices_len = inputs[3].to_i32() as u32;

    let mem = frame
        .memory(0)
        .ok_or(wasmedge_sdk::error::WasmEdgeError::Vm(
            wasmedge_sdk::error::VmError::ExecuteFailed,
        ))?;

    let content = String::from_utf8_lossy(
        &mem.read(content_ptr, content_len).map_err(|_| {
            wasmedge_sdk::error::WasmEdgeError::Vm(wasmedge_sdk::error::VmError::ExecuteFailed)
        })?,
    )
    .to_string();

    let choices_json = String::from_utf8_lossy(
        &mem.read(choices_ptr, choices_len).map_err(|_| {
            wasmedge_sdk::error::WasmEdgeError::Vm(wasmedge_sdk::error::VmError::ExecuteFailed)
        })?,
    )
    .to_string();

    let choices: Vec<String> = serde_json::from_str(&choices_json).unwrap_or_default();

    let chat = {
        let state = data.lock().unwrap();
        Arc::clone(&state.chat)
    };

    let result = match chat.categorise(content, choices) {
        Ok(r) => r,
        Err(e) => format!("Error: {}", e),
    };

    let serialised = result.into_bytes();
    let result_len = serialised.len() as i32;

    {
        let mut state = data.lock().unwrap();
        state.last_result = serialised;
    }

    Ok(vec![WasmValue::from_i32(result_len)])
}

pub fn create_vm(db: Arc<AsyncDatabase>, chat: Arc<ChatManager>) -> Result<wasmedge_sdk::Vm> {
    PluginManager::load_default_paths();

    let config = ConfigBuilder::new(wasmedge_sdk::config::CommonConfigOptions::default())
        .with_host_registration_config(HostRegistrationConfigOptions::default().wasi(true))
        .build()?;

    let state = Arc::new(Mutex::new(HostState {
        db,
        chat,
        last_result: Vec::new(),
    }));

    let import = ImportObjectBuilder::new()
        .with_func::<(i32, i32), i32, Arc<Mutex<HostState>>>(
            "host_db_query",
            host_db_query,
            Some(state.clone()),
        )?
        .with_func::<(i32, i32), i32, Arc<Mutex<HostState>>>(
            "host_copy_result",
            host_copy_result,
            Some(state.clone()),
        )?
        .with_func::<(i32, i32, i32, i32), i32, Arc<Mutex<HostState>>>(
            "host_chat_send_message",
            host_chat_send_message,
            Some(state.clone()),
        )?
        .with_func::<(i32, i32, i32, i32), i32, Arc<Mutex<HostState>>>(
            "host_predict_call",
            host_predict_call,
            Some(state.clone()),
        )?
        .with_func::<(i32, i32, i32, i32), i32, Arc<Mutex<HostState>>>(
            "host_categorise_call",
            host_categorise_call,
            Some(state),
        )?
        .build::<Arc<Mutex<HostState>>>("env")?;

    let mut vm = VmBuilder::new().with_config(config).build()?;

    vm.register_import_module(import)?;

    Ok(vm)
}
