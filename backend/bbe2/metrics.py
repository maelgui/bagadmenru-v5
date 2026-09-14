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

PASSWORD_RESETS = Counter(
    "bbe2_password_resets_total",
    "Password reset funnel.",
    # stage: requested (reset email actually sent, i.e. account exists)
    #        | completed (new password set via the emailed link)
    ["stage"],
)
