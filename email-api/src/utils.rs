use imap::types::Fetch;
use mailparse::{addrparse, parse_mail, MailHeaderMap, ParsedMail};

use crate::{errors::MailError, models::Email, settings::Settings};

fn extract_display_name(email: &ParsedMail) -> Option<String> {
    addrparse(&email.headers.get_first_value("From")?).ok()?.extract_single_info()?.display_name
}
fn parse_fetch_result(message: &Fetch) -> Result<Email, MailError> {
    let email = parse_mail(message.header().expect("no header"))?;

    let from = extract_display_name(&email);

    Ok(Email {
        subject: email.headers.get_first_value("Subject").expect("msg"),
        datetime: dateparser::parse(
            email
                .headers
                .get_first_value("Date")
                .ok_or(MailError::MissingFieldError)?
                .as_str(),
        )
        .map_err(|_| MailError::InvalidDateError)?,
        from,
    })
}

pub fn fetch_inbox_top(settings: Settings) -> Result<Vec<Email>, MailError> {
    // we pass in the domain twice to check that the server's TLS
    // certificate is valid for the domain we're connecting to.
    let client = imap::ClientBuilder::new(settings.imap_domain, settings.imap_port).connect()?;

    // the client we have here is unauthenticated.
    // to do anything useful with the e-mails, we need to log in
    let mut imap_session = client
        .login(settings.imap_username, settings.imap_password)
        .map_err(|e| e.0)?;

    // we want to fetch the first email in the INBOX mailbox
    imap_session.select("INBOX")?;

    let unseen = imap_session.search("UNSEEN")?;
    let seq = unseen
        .iter()
        .map(|u| u.to_string())
        .collect::<Vec<_>>()
        .join(",");

    let messages = imap_session.fetch(seq, "RFC822.HEADER")?;

    let res: Result<Vec<_>, MailError> = messages.iter().map(parse_fetch_result).collect();

    imap_session.logout()?;

    res
}
