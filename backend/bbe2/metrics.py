"""Prometheus metrics for authentication flows.

The ``/metrics`` endpoint (mounted in ``main.py``) lives at the app root,
outside ``/api``: the ingress only forwards ``/api`` (and ``/_mail``) to the
backend, so metrics stay cluster-internal and need no auth.

Label values are kept to small fixed sets (Prometheus best practice: low
cardinality). Counters are process-local; uvicorn runs a single worker in
every environment, so no multiprocess registry is needed.

Two families live here:

* **Counters** (``*_total``) record *flow* — how many times an event happened.
  They are incremented from the endpoints/services as things occur.
* **Gauges** describe *state* — how many members are in a given situation
  *right now* (e.g. how many have a passkey). A counter cannot answer that:
  the membership base changes by direct DB writes (an admin deactivates a
  member, someone deletes their last passkey) that no event stream captures.
  Rather than connecting Grafana straight to Postgres (a second DB access path
  to secure and a private tunnel to run), we follow the standard Prometheus
  pattern: a *custom collector* whose ``collect()`` runs a couple of cheap
  ``COUNT`` queries at scrape time and yields the current values. The backend
  already owns the DB connection, so no new surface is added.
"""

from collections.abc import Iterator
from typing import Callable, Dict, Optional, Tuple

from prometheus_client import Counter
from prometheus_client.core import GaugeMetricFamily
from prometheus_client.registry import Collector
from sqlalchemy import func, select

from bbe2.config import Settings, get_settings
from bbe2.database import session_ctx
from bbe2.models import PasskeyDB, PushSubscriptionDB, UserDB

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


class MembershipStateCollector(Collector):
    """Yields point-in-time membership/credential gauges at scrape time.

    Registered once at startup (``register_membership_gauges``). Prometheus
    calls ``collect()`` on every scrape, so the counts are always fresh without
    a background job. The queries are trivial on the bagad's scale (~100 rows);
    if the membership base ever grew large enough for per-scrape counts to hurt,
    switch to a cached value refreshed on a timer — the metric names stay the
    same.

    All labels are fixed, low-cardinality buckets. No per-user label is ever
    emitted, so nothing identifies a member (RGPD-safe, Prometheus-friendly).

    ``settings_getter`` resolves the settings (hence the DB URL) lazily on every
    scrape rather than capturing them at registration time. ``main.py`` passes a
    getter that honours FastAPI's ``dependency_overrides`` so the test client
    scrapes its throwaway SQLite; in production it is plain ``get_settings``.

    The whole ``collect()`` is defensive: a scrape must never 500 the endpoint
    (that would blind the HTTP/latency metrics too), so a DB hiccup yields no
    membership samples rather than raising.
    """

    def __init__(self, settings_getter: Callable[[], Settings] = get_settings) -> None:
        self._settings_getter = settings_getter

    def collect(self) -> Iterator[GaugeMetricFamily]:
        snapshot = self._gather()
        if snapshot is None:
            return
        active, inactive, cred_counts, passkeys_total, subs_total = snapshot

        users = GaugeMetricFamily(
            "bbe2_users",
            "Members by active state (the denominator for adoption ratios).",
            labels=["state"],
        )
        users.add_metric(["active"], active)
        users.add_metric(["inactive"], inactive)
        yield users

        creds = GaugeMetricFamily(
            "bbe2_users_credentials",
            "Active members by which sign-in credentials they currently hold. "
            "Buckets overlap (passkey and password count a dual-credential "
            "member in both); the *_only and none buckets are exclusive.",
            labels=["credential"],
        )
        for credential, count in cred_counts.items():
            creds.add_metric([credential], count)
        yield creds

        passkeys = GaugeMetricFamily(
            "bbe2_passkeys",
            "Total registered passkeys (a member can register several "
            "devices, so this can exceed the passkey-holding member count).",
        )
        passkeys.add_metric([], passkeys_total)
        yield passkeys

        subs = GaugeMetricFamily(
            "bbe2_push_subscriptions",
            "Active Web Push subscriptions (a member can subscribe on "
            "several devices).",
        )
        subs.add_metric([], subs_total)
        yield subs

    def _gather(
        self,
    ) -> Optional[Tuple[int, int, Dict[str, int], int, int]]:
        try:
            database_url = self._settings_getter().database_url
            with session_ctx(database_url) as session:
                # One pass over users: bucket each by active state and by which
                # credentials they hold. "active" is what every adoption ratio
                # divides by, so it must be its own dimension.
                active = inactive = 0
                cred_counts = {
                    "passkey": 0,  # has >= 1 passkey (regardless of password)
                    "password": 0,  # has a password set (regardless of passkey)
                    "passkey_only": 0,  # passkey but no password
                    "password_only": 0,  # password but no passkey
                    "none": 0,  # neither — cannot sign in, worth watching
                }
                rows = session.execute(
                    select(
                        UserDB.is_active,
                        UserDB.password.isnot(None),
                        select(func.count())  # pylint: disable=not-callable
                        .where(PasskeyDB.passkey_user_id == UserDB.passkey_user_id)
                        .correlate(UserDB)
                        .scalar_subquery()
                        > 0,
                    )
                ).all()
                for is_active, has_password, has_passkey in rows:
                    if is_active:
                        active += 1
                    else:
                        inactive += 1
                    # Credential buckets are scoped to active members: a
                    # deactivated account's credentials are not an adoption
                    # signal.
                    if not is_active:
                        continue
                    if has_passkey:
                        cred_counts["passkey"] += 1
                    if has_password:
                        cred_counts["password"] += 1
                    if has_passkey and not has_password:
                        cred_counts["passkey_only"] += 1
                    elif has_password and not has_passkey:
                        cred_counts["password_only"] += 1
                    elif not has_password and not has_passkey:
                        cred_counts["none"] += 1

                passkeys_total = session.scalar(
                    select(func.count()).select_from(  # pylint: disable=not-callable
                        PasskeyDB
                    )
                )
                subs_total = session.scalar(
                    select(func.count()).select_from(  # pylint: disable=not-callable
                        PushSubscriptionDB
                    )
                )
                return (
                    active,
                    inactive,
                    cred_counts,
                    passkeys_total or 0,
                    subs_total or 0,
                )
        except Exception:  # pylint: disable=broad-except
            # A scrape must never fail on a transient DB error: emit no
            # membership samples this round instead of 500-ing /metrics.
            return None


def register_membership_gauges(
    settings_getter: Callable[[], Settings] = get_settings,
) -> None:
    """Register the membership-state collector on the default registry.

    Idempotent: called once from ``main.py`` at startup. Guards against a
    double registration (e.g. app re-import in tests) by ignoring the
    duplicated-timeseries error the registry raises.
    """
    from prometheus_client import REGISTRY

    try:
        REGISTRY.register(MembershipStateCollector(settings_getter))
    except ValueError:
        # Already registered (duplicate timeseries) — leave the first one.
        pass
