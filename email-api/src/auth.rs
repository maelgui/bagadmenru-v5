// use jsonwebtoken::{
//     decode, decode_header, jwk::{Jwk, JwkSet, KeyAlgorithm}, Algorithm, DecodingKey, EncodingKey, Header, TokenData, Validation
// };
// use serde::{Deserialize, Serialize};
// use thiserror::Error;

// /// Our claims struct, it needs to derive `Serialize` and/or `Deserialize`
// #[derive(Debug, Serialize, Deserialize)]
// pub struct Claims {
//     pub aud: String, // Optional. Audience
//     pub exp: usize, // Required (validate_exp defaults to true in validation). Expiration time (as UTC timestamp)
//     pub iat: usize, // Optional. Issued at (as UTC timestamp)
//     pub iss: String, // Optional. Issuer
//     pub sub: String, // Optional. Subject (whom token refers to)
// }

// #[derive(Debug, Deserialize)]
// struct OidcConfig {
//     jwks_uri: String,
// }

// #[derive(Debug, Error)]
// pub enum ValidationError {
//     #[error("HTTP Request Failed")]
//     RequestFailed(#[from] reqwest::Error),
//     #[error("Failed to discover OIDC Configuration")]
//     DiscoverError,
//     #[error("Decoding of JWKS Failed")]
//     DecodeError(#[from] base64::DecodeError),
//     #[error("JWT was missing kid, alg, or decoding components")]
//     InvalidJWK,
//     #[error("Issuer URL Invalid")]
//     IssuerParseError,
//     #[error("Invalid algorithm {0}")]
//     InvalidAlgorithm(String),

//     // #[error("Unable to decode jwt header")]
//     // InvalidJWTHeader(#[from] jsonwebtoken::errors::Error),

//     #[error("JWT Is Invalid")]
//     ValidationFailed(#[from] jsonwebtoken::errors::Error),
//     #[error("Unknown error")]
//     UnknownError,
//     #[error("Token did not contain a KID field")]
//     MissingKIDToken,
//     #[error("The KID in the token was not present in the JWKS")]
//     MissingKIDJWKS,
// }


// #[derive(Clone)]
// pub struct Validator {
//     issuer: String,
//     http_client: reqwest::Client,
//     jwks_uri: String,
//     jwks: JwkSet,
// }
// impl Validator {
//     pub async fn new(issuer: String) -> Result<Validator, ValidationError> {
//         let http_client = reqwest::Client::new();
//         let request = http_client
//             .get(format!("{}/.well-known/openid-configuration", issuer))
//             .send()
//             .await?;
//         let jwks_uri = request.json::<OidcConfig>().await?.jwks_uri;

//         let mut val = Validator {
//             issuer,
//             http_client,
//             jwks: JwkSet { keys: vec![] },
//             jwks_uri,
//         };
//         val.update_jwks().await?;
//         Ok(val)
//     }
//     async fn update_jwks(&mut self) -> Result<(), ValidationError> {
//         let request = self.http_client.get(self.jwks_uri.clone()).send().await?;
//         let jwks = request.json().await?;
//         self.jwks = jwks;
//         Ok(())
//     }

//     pub fn validate(&self, token: String) -> Result<TokenData<Claims>, ValidationError> {
//         let header = decode_header(&token)?;
//         let kid = header.kid.ok_or(ValidationError::MissingKIDToken)?;
//         let alg = header.alg;
//         let jwk = self
//             .jwks
//             .find(&kid)
//             .ok_or(ValidationError::MissingKIDJWKS)?;
//         let mut validation = Validation::new(alg);
//         validation.set_audience(&["http://localhost:5173"]);
//         validation.set_issuer(&[self.issuer.clone()]);
//         let decoding_key = DecodingKey::from_jwk(jwk)?;
//         decode::<Claims>(&token, &decoding_key, &validation).map_err(ValidationError::ValidationFailed)
//     }
// }
