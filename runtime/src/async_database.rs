use crate::types::{json_to_sql_param, sql_value_to_json};
use anyhow::Result;
use async_trait::async_trait;
use rusqlite::{params_from_iter, Connection};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::sync::{Arc, Mutex};

#[derive(Deserialize, Debug)]
pub struct QueryPayload {
    pub sql: String,
    pub params: Vec<JsonValue>,
    pub method: String,
}

#[derive(Serialize, Debug)]
pub struct QueryResult {
    pub rows: Option<Vec<Vec<JsonValue>>>,
    pub last_insert_row_id: Option<i64>,
    pub changes: Option<usize>,
    pub error: Option<String>,
}

pub struct AsyncDatabase {
    conn: Arc<Mutex<Connection>>,
}

impl Clone for AsyncDatabase {
    fn clone(&self) -> Self {
        Self {
            conn: Arc::clone(&self.conn),
        }
    }
}

impl AsyncDatabase {
    pub async fn new(path: &str) -> Result<Self> {
        let path = path.to_string();
        let conn = smol::unblock(move || {
            let c = if path == ":memory:" {
                Connection::open_in_memory()?
            } else {
                Connection::open(&path)?
            };

            c.pragma_update(None, "journal_mode", "WAL")?;
            c.pragma_update(None, "synchronous", "NORMAL")?;
            c.pragma_update(None, "foreign_keys", "ON")?;
            c.busy_timeout(std::time::Duration::from_secs(5))?;

            Ok::<_, rusqlite::Error>(c)
        })
        .await?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub async fn execute(&self, payload: QueryPayload) -> Result<QueryResult> {
        let conn = Arc::clone(&self.conn);
        smol::unblock(move || {
            let conn = conn.lock().unwrap();

            let sql_params = payload
                .params
                .into_iter()
                .map(json_to_sql_param)
                .collect::<Vec<_>>();

            let mut stmt = match conn.prepare(&payload.sql) {
                Ok(s) => s,
                Err(e) => {
                    return Ok(QueryResult {
                        rows: None,
                        last_insert_row_id: None,
                        changes: None,
                        error: Some(e.to_string()),
                    })
                }
            };

            match payload.method.as_str() {
                "run" => match stmt.execute(params_from_iter(sql_params)) {
                    Ok(changes) => {
                        let last_id = conn.last_insert_rowid();
                        Ok(QueryResult {
                            rows: None,
                            last_insert_row_id: Some(last_id),
                            changes: Some(changes),
                            error: None,
                        })
                    }
                    Err(e) => Ok(QueryResult {
                        rows: None,
                        last_insert_row_id: None,
                        changes: None,
                        error: Some(e.to_string()),
                    }),
                },
                "all" | "get" | "values" => {
                    let column_count = stmt.column_count();
                    let rows = stmt.query_map(params_from_iter(sql_params), |row| {
                        let mut row_data = Vec::new();
                        for i in 0..column_count {
                            let val = row.get_ref(i)?;
                            row_data.push(sql_value_to_json(val));
                        }
                        Ok(row_data)
                    });

                    match rows {
                        Ok(r) => {
                            let mut results = Vec::new();
                            for row in r {
                                results.push(row?);
                                if payload.method == "get" {
                                    break;
                                }
                            }
                            Ok(QueryResult {
                                rows: Some(results),
                                last_insert_row_id: None,
                                changes: None,
                                error: None,
                            })
                        }
                        Err(e) => Ok(QueryResult {
                            rows: None,
                            last_insert_row_id: None,
                            changes: None,
                            error: Some(e.to_string()),
                        }),
                    }
                }
                _ => Err(anyhow::anyhow!("Unsupported method: {}", payload.method)),
            }
        })
        .await
    }

    pub async fn batch_execute(&self, queries: Vec<QueryPayload>) -> Result<Vec<QueryResult>> {
        let conn = Arc::clone(&self.conn);
        smol::unblock(move || {
            let mut conn = conn.lock().unwrap();
            let transaction = conn.transaction()?;
            let mut results = Vec::new();

            for payload in queries {
                let sql_params = payload
                    .params
                    .iter()
                    .map(|p| json_to_sql_param(p.clone()))
                    .collect::<Vec<_>>();

                let mut stmt = transaction.prepare(&payload.sql)?;

                match payload.method.as_str() {
                    "run" => {
                        let changes = stmt.execute(params_from_iter(sql_params))?;
                        let last_id = transaction.last_insert_rowid();
                        results.push(QueryResult {
                            rows: None,
                            last_insert_row_id: Some(last_id),
                            changes: Some(changes),
                            error: None,
                        });
                    }
                    "all" | "get" | "values" => {
                        let column_count = stmt.column_count();
                        let rows = stmt.query_map(params_from_iter(sql_params), |row| {
                            let mut row_data = Vec::new();
                            for i in 0..column_count {
                                let val = row.get_ref(i)?;
                                row_data.push(sql_value_to_json(val));
                            }
                            Ok(row_data)
                        })?;

                        let mut query_results = Vec::new();
                        for row in rows {
                            query_results.push(row?);
                            if payload.method == "get" {
                                break;
                            }
                        }

                        results.push(QueryResult {
                            rows: Some(query_results),
                            last_insert_row_id: None,
                            changes: None,
                            error: None,
                        });
                    }
                    _ => return Err(anyhow::anyhow!("Unsupported method: {}", payload.method)),
                }
            }

            transaction.commit()?;
            Ok(results)
        })
        .await
    }
}

#[async_trait]
pub trait DatabaseExecutor {
    async fn query(&self, sql: &str, params: Vec<JsonValue>) -> Result<QueryResult>;
    async fn execute(&self, sql: &str, params: Vec<JsonValue>) -> Result<QueryResult>;
}

#[async_trait]
impl DatabaseExecutor for AsyncDatabase {
    async fn query(&self, sql: &str, params: Vec<JsonValue>) -> Result<QueryResult> {
        self.execute(QueryPayload {
            sql: sql.to_string(),
            params,
            method: "all".to_string(),
        })
        .await
    }

    async fn execute(&self, sql: &str, params: Vec<JsonValue>) -> Result<QueryResult> {
        self.execute(QueryPayload {
            sql: sql.to_string(),
            params,
            method: "run".to_string(),
        })
        .await
    }
}
