use base64::Engine;
use rusqlite::types::{ToSql, ValueRef};
use serde_json::Value as JsonValue;

pub fn json_to_sql_param(value: JsonValue) -> Box<dyn ToSql> {
    match value {
        JsonValue::Null => Box::new(rusqlite::types::Null),
        JsonValue::Bool(b) => Box::new(b),
        JsonValue::Number(n) => {
            if let Some(i) = n.as_i64() {
                Box::new(i)
            } else {
                Box::new(n.as_f64().unwrap())
            }
        }
        JsonValue::String(s) => Box::new(s),
        _ => panic!("Complex types not supported as SQL parameters"),
    }
}

pub fn sql_value_to_json(value: ValueRef) -> JsonValue {
    match value {
        ValueRef::Null => JsonValue::Null,
        ValueRef::Integer(i) => JsonValue::Number(i.into()),
        ValueRef::Real(f) => JsonValue::Number(serde_json::Number::from_f64(f).unwrap()),
        ValueRef::Text(s) => JsonValue::String(String::from_utf8_lossy(s).into_owned()),
        ValueRef::Blob(b) => JsonValue::String(base64::engine::general_purpose::STANDARD.encode(b)),
    }
}
