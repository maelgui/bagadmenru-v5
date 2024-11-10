use chrono::{DateTime, Utc};
use serde::Serialize;


#[derive(Serialize, Debug)]
pub struct Email {
    pub subject: String,
    pub datetime: DateTime<Utc>,
    pub from: Option<String>,
}
