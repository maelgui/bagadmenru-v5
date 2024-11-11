use axum::{http::StatusCode, response::{IntoResponse, Response}, Json};
use lettre::address::AddressError;
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MailError {
    #[error("IMAP request failed: {0:?}")]
    ImapError(#[from] imap::error::Error),
    #[error("IMAP response parsing failed")]
    ParseError(#[from] mailparse::MailParseError),
    #[error("Unable to retrieve field in response")]
    MissingFieldError,
    #[error("Unable to parse date")]
    InvalidDateError,
    #[error("Unable to send email")]
    SendmailError(#[from] lettre::error::Error),
    #[error("Invalid to send email")]
    InvalidAddressError(#[from] AddressError),

    #[error("SMTP request failed: {0:?}")]
    SmtpError(#[from] lettre::transport::smtp::Error)
}


// Tell axum how `AppError` should be converted into a response.
//
// This is also a convenient place to log errors.
impl IntoResponse for MailError {
    fn into_response(self) -> Response {
        // How we want errors responses to be serialized
        #[derive(Serialize)]
        struct ErrorResponse {
            message: String,
        }

        // let (status, message) = match self {
        //     MailError::JsonRejection(rejection) => {
        //         // This error is caused by bad user input so don't log it
        //         (rejection.status(), rejection.body_text())
        //     }
        //     MailError::TimeError(err) => {
        //         // Because `TraceLayer` wraps each request in a span that contains the request
        //         // method, uri, etc we don't need to include those details here
        //         tracing::error!(%err, "error from time_library");

        //         // Don't expose any details about the error to the client
        //         (
        //             StatusCode::INTERNAL_SERVER_ERROR,
        //             "Something went wrong".to_owned(),
        //         )
        //     }
        // };

        (StatusCode::INTERNAL_SERVER_ERROR, Json(ErrorResponse { message: self.to_string() })).into_response()
    }
}
