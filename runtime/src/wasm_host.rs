use crate::database::{Database, QueryPayload};
use anyhow::Result;
use std::sync::{Arc, Mutex};
use wasmedge_sdk::{
    config::{ConfigBuilder, HostRegistrationConfigOptions},
    params,
    plugin::PluginManager,
    CallingFrame, ImportObjectBuilder, VmBuilder, WasmEdgeResult, WasmValue,
};

pub struct HostState {
    pub db: Arc<Database>,
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

    let result = match db.execute(payload) {
        Ok(r) => r,
        Err(e) => crate::database::QueryResult {
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

pub fn create_vm(db_path: &str) -> Result<wasmedge_sdk::Vm> {
    PluginManager::load_default_paths();

    let config = ConfigBuilder::new(wasmedge_sdk::config::CommonConfigOptions::default())
        .with_host_registration_config(HostRegistrationConfigOptions::default().wasi(true))
        .build()?;

    let db = smol::block_on(async { Database::new(db_path).await })?;

    let state = Arc::new(Mutex::new(HostState {
        db: Arc::new(db),
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
            Some(state),
        )?
        .build::<Arc<Mutex<HostState>>>("env")?;

    let mut vm = VmBuilder::new().with_config(config).build()?;

    vm.register_import_module(import)?;

    Ok(vm)
}
