use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;


#[derive(Serialize, Debug)]
pub struct Email {
    pub subject: String,
    pub datetime: DateTime<Utc>,
    pub from: Option<String>,
}

#[derive(Deserialize, Debug, Clone, Validate)]
pub struct Sendmail {
    #[validate(email)]
    pub to: String,
    #[validate(length(min = 1, max = 100))]
    pub subject: String,
    #[validate(length(min = 1))]
    pub body_html: String,
    #[validate(length(min = 1))]
    pub body_text: String,
}
