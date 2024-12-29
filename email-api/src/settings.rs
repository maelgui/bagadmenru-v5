use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub(crate) struct Settings {
    pub imap_domain: String,
    pub imap_port: u16,
    pub imap_username: String,
    pub imap_password: String,
    pub listen: String,
    pub email_from: String,
    pub smtp_domain: String,
    pub smtp_port: u16,
    pub smtp_username: Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_tls: bool,
    pub dry_run: Option<bool>,
}

impl Settings {
    pub(crate) fn new() -> Result<Self, ConfigError> {
        let s = Config::builder()
            // Start off by merging in the "default" configuration file
            .add_source(File::with_name("settings.toml").required(false))
            // Add in settings from the environment (with a prefix of APP)
            // Eg.. `APP_DEBUG=1 ./target/app` would set the `debug` key
            .add_source(Environment::with_prefix("app"))
            .set_default("smtp_tls", true)?
            // You may also programmatically change settings
            .build()?;

        // Now that we're done, let's access our configuration
        println!("debug: {:?}", s);

        // You can deserialize (and thus freeze) the entire configuration as
        s.try_deserialize()
    }
}
