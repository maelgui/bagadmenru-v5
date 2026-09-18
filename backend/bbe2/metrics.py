"""Prometheus metrics for authentication flows.

The ``/metrics`` endpoint (mounted in ``main.py``) lives at the app root,
outside ``/api``: the ingress only forwards ``/api`` (and ``/_mail``) to the
backend, so metrics stay cluster-internal and need no auth.

Label values are kept to small fixed sets (Prometheus best practice: low
cardinality). Counters are process-local; uvicorn runs a single worker in
every environment, so no multiprocess registry is needed.
"""

from prometheus_client import Counter

AUTH_LOGINS = Counter(
    "bbe2_auth_logins_total",
    "Login attempts by method and outcome.",
    # method: password | passkey
    # outcome: success | bad_credentials | invalid_request | missing_challenge
    #          | unknown_credential (passkey deleted server-side; the client
    #            is told via 404 so it can signal the provider)
    ["method", "outcome"],
)

WEBAUTHN_REGISTRATIONS = Counter(
    "bbe2_webauthn_registrations_total",
    "Passkey registration ceremonies by flow and outcome.",
    # flow: the intent the client declares at /webauthn/preregister —
    #       explicit (settings page / post-reset enrolment)
    #       | silent (conditional create after password login)
    #       | unknown (register reached without a preregister in the session)
    # outcome: started (preregister served) | success | missing_challenge
    #          | invalid
    # started vs success gives the funnel: silent ceremonies the browser
    # declines after preregister never reach /webauthn/register at all.
    ["flow", "outcome"],
)

LOGIN_LINKS = Counter(
    "bbe2_login_links_total",
    "Email recovery funnel (single flow for every account type).",
    # stage: requested (recovery email actually sent, i.e. account exists)
    #        | used_code (signed in by typing the emailed 6-digit code, primary)
    #        | used_link (signed in via the emailed link — same grant+code
    #          prefilled in a URL; the split is client-declared and only
    #          exists for this funnel)
    ["stage"],
)

PUSH_SENDS = Counter(
    "bbe2_push_sends_total",
    "Web push delivery attempts by kind and outcome.",
    # kind: event (new event notification) | test (device test button)
    # outcome: success
    #          | expired (endpoint answered 404/410; subscription pruned)
    #          | failure (any other WebPushException)
    # Deliveries skipped because VAPID keys are unset are not counted: nothing
    # was attempted.
    ["kind", "outcome"],
)

EMAILS_SENT = Counter(
    "bbe2_emails_sent_total",
    "Outgoing SMTP emails by outcome.",
    # outcome: success | failure (SMTP/transport error; the send raises)
    # Dry-run mode (email_dry_run) does not count: nothing was attempted.
    ["outcome"],
)

INVITATIONS = Counter(
    "bbe2_invitations_total",
    "Member invitation funnel.",
    # stage: created (token issued) | viewed (valid token opened)
    #        | otp_requested (verification code emailed)
    #        | accepted (account created)
    # viewed counts every valid GET, so re-opens inflate it slightly; it is a
    # funnel indicator, not an exact unique-visitor count.
    ["stage"],
)

HELLOASSO_WEBHOOKS = Counter(
    "bbe2_helloasso_webhooks_total",
    "HelloAsso webhook deliveries by outcome.",
    # outcome: ok (persisted) | ignored (authentic but unrecognized shape)
    #          | invalid_signature (rejected 401) | invalid_json (rejected 400)
    # A spike of invalid_signature means someone is probing the endpoint.
    ["outcome"],
)

EVENT_RESPONSES = Counter(
    "bbe2_event_responses_total",
    "Event RSVP responses recorded.",
    # source: app (authenticated PUT from the UI)
    #         | link (quick-answer token from email/push notification)
    # value: yes | no
    ["source", "value"],
)
