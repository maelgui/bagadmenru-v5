mod errors;
mod models;
mod settings;
mod utils;

use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use errors::MailError;
use futures::future;
use lettre::{
    message::{header::ContentType, MultiPart, SinglePart},
    transport::smtp::{authentication::Credentials, response::Response as SmtpResponse},
    AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
};
use models::{Email, Sendmail};
use settings::Settings;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utils::fetch_inbox_top;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| format!("{}=debug", env!("CARGO_CRATE_NAME")).into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let settings = Settings::new().expect("Unable to load settings");
    let listen_addr = settings.listen.to_owned();

    // build our application with a route
    let app = Router::new()
        .route("/", get(root))
        .route("/mailbox/emails", get(retrieve_emails))
        .route("/sendmail", post(sendmail))
        .layer(TraceLayer::new_for_http())
        .with_state(settings);

    // run our app with hyper, listening globally on port 3000
    let listener = tokio::net::TcpListener::bind(listen_addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

// basic handler that responds with a static string
async fn root() -> &'static str {
    "Hello, World!"
}

async fn retrieve_emails(State(settings): State<Settings>) -> Result<Json<Vec<Email>>, MailError> {
    fetch_inbox_top(settings).map(|res| Json(res))
}

// async fn auth(
//     State(validator): State<Validator>,
//     mut req: Request,
//     next: Next,
// ) -> Result<Response, StatusCode> {
//     let auth_header = req
//         .headers()
//         .get(http::header::AUTHORIZATION)
//         .and_then(|header| header.to_str().ok())
//         .and_then(|s| s.split_once(" "));

//     let token = if let Some(("Bearer", token)) = auth_header {
//         token
//     } else {
//         return Err(StatusCode::UNAUTHORIZED);
//     };

//     match validator.validate(token.to_owned()) {
//         Ok(current_user) => {
//             println!("debug: {:?}", current_user);
//             Ok(next.run(req).await)
//         }
//         Err(err) => {
//             println!("debug: unauthoriwed {:?}", err);
//             Err(StatusCode::UNAUTHORIZED)
//         }
//     }
// }

fn parse_email_payload(email_payload: Sendmail, from: String) -> Result<Message, MailError> {
    let email = Message::builder()
        .from(from.parse()?)
        .to(email_payload.to.parse()?)
        .subject(email_payload.subject)
        .multipart(
            MultiPart::alternative() // This is composed of two parts.
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_PLAIN)
                        .body(email_payload.body_text), // Every message should have a plain text fallback.
                )
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_HTML)
                        .body(email_payload.body_html),
                ),
        )?;

    Ok(email)
}

// #[axum::debug_handler]
async fn sendmail(
    State(settings): State<Settings>,
    Json(payload): Json<Vec<Sendmail>>,
) -> Result<Json<Vec<SmtpResponse>>, MailError> {
    let mut builder =
        AsyncSmtpTransport::<Tokio1Executor>::relay(&settings.smtp_domain)?
            .port(settings.smtp_port);
    if let (Some(username), Some(password)) = (settings.smtp_username, settings.smtp_password) {
        let creds = Credentials::new(username, password);
        builder = builder.credentials(creds);
    }
    if !settings.smtp_tls {
        builder = builder.tls(lettre::transport::smtp::client::Tls::None);
    }
    let mailer = builder.build();

    let messages: Vec<Message> = payload
        .iter()
        .map(|e| parse_email_payload(e.clone(), settings.email_from.clone()))
        .collect::<Result<Vec<_>, _>>()?;
    let res = future::try_join_all(messages.iter().map(|m| mailer.send(m.clone()))).await?;

    Ok(Json(res))
}
