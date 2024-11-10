mod errors;
mod models;
mod settings;
mod utils;

use tower_http::cors::{Any, CorsLayer};
use axum::{
    extract::{Request, State},
    http::{self, HeaderName},
    middleware::{self, Next},
    response::Response,
    routing::get,
    Json, Router,
};
use errors::MailError;
use models::Email;
use settings::Settings;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utils::fetch_inbox_top;
use http::Method;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| format!("{}=debug", env!("CARGO_CRATE_NAME")).into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let settings = Settings::new().expect("Unabe to load settings");
    let listen_addr = settings.listen.to_owned();

    // build our application with a route
    let app = Router::new()
        .route("/", get(root))
        .route("/emails", get(retrieve_emails))
        .layer(CorsLayer::new()
            // allow `GET` and `POST` when accessing the resource
            .allow_methods([Method::GET, Method::POST])
            // allow requests from any origin
            .allow_origin(Any)
        )
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
