"""Background notification tasks.

These functions are designed to be used with FastAPI BackgroundTasks.
They only receive plain/serializable data (no ORM objects).
"""

import logging
from typing import Optional

import aiosmtplib
from sqlalchemy import select

from bbe2.config import Settings
from bbe2.database import session_ctx
from bbe2.models.action_token import ActionTokenValue
from bbe2.models.user import UserDB
from bbe2.schemas.event import EventCreate
from bbe2.services.email import EmailAttachment
from bbe2.services.push_service import send_push_to_users
from bbe2.utils.action_token import create_action_token
from bbe2.utils.auth import Action
from bbe2.utils.correlation import set_correlation_id
from bbe2.utils.ics import build_event_invite_ics
from bbe2.utils.permissions import Resource, is_allowed
from bbe2.utils.templates import EmailData, EmailSender

logger = logging.getLogger(__name__)


def _invite_attachment(
    settings: Settings, event: EventCreate, event_id: int, user: UserDB
) -> EmailAttachment:
    """Build the per-recipient iTIP (METHOD:REQUEST) calendar attachment."""
    return EmailAttachment(
        filename="invitation.ics",
        maintype="text",
        subtype="calendar",
        params={"method": "REQUEST", "charset": "UTF-8"},
        content=build_event_invite_ics(
            event_id=event_id,
            title=event.title,
            description=event.description,
            begin=event.date,
            organizer_email=settings.email_from_address,
            organizer_name=settings.email_from_name,
            attendee_email=user.email,
            attendee_name=f"{user.first_name} {user.last_name}",
            domain=settings.relying_party_id,
        ),
    )


async def notify_new_event(
    sender: EmailSender,
    settings: Settings,
    event: EventCreate,
    event_id: int,
    correlation_id: Optional[str] = None,
) -> None:
    """Background task: send email + push notifications for a new event.

    Args:
        event: The EventCreate schema (Pydantic model with title, description, date, costume, etc.)
        event_id: The database ID of the created event.
        correlation_id: Correlation ID captured from the originating request.
            Re-set here because background tasks run outside the request's
            context, so the email service can stamp it on outgoing mail.

    Fetches eligible users from the database using its own session.
    """
    if correlation_id:
        set_correlation_id(correlation_id)
    with session_ctx(settings.database_url) as session:
        # Fetch eligible users
        all_users = session.scalars(
            select(UserDB).where(UserDB.is_active).order_by(UserDB.last_name)
        ).all()

        users = [
            user
            for user in all_users
            if user.receives_emails
            and is_allowed(
                roles=[r.id for g in user.groups for r in g.roles],
                action=Action.CREATE,
                resource=Resource.RESPONSE,
            )
        ]

        if not users:
            return

        frontend_url = str(settings.frontend_base_url).rstrip("/")

        # Issue one RSVP quick-answer token and one unsubscribe token per user.
        # Tokens are random secrets stored (hashed) in the action_tokens table;
        # commit once after creating them all.
        tokens_by_user: dict[str, tuple[str, str]] = {}
        for user in users:
            rsvp_token = create_action_token(
                session,
                ActionTokenValue.CreateResponseByToken,
                {"user_id": user.id, "event_id": event_id},
            )
            unsubscribe_token = create_action_token(
                session,
                ActionTokenValue.Unsubscribe,
                {"user_id": user.id},
            )
            tokens_by_user[user.id] = (rsvp_token, unsubscribe_token)
        session.commit()

        # Send emails
        try:
            await sender.batch_send_emails(
                subject=f"[Nouvelle sortie] {event.title}",
                template_name="email_new_event",
                template_data=[
                    EmailData(
                        to=user.email,
                        template_data={
                            "event": event,
                            "frontend_url": frontend_url,
                            "token": tokens_by_user[user.id][0],
                            "unsubscribe_token": tokens_by_user[user.id][1],
                        },
                        attachments=[
                            _invite_attachment(settings, event, event_id, user)
                        ],
                    )
                    for user in users
                ],
            )
        except (OSError, aiosmtplib.SMTPException) as exc:
            logger.error("Unable to send batch email: %s", exc)

        # Send push notifications
        try:
            send_push_to_users(
                session=session,
                settings=settings,
                user_ids=[user.id for user in users],
                title=f"Nouvelle sortie : {event.title}",
                body=event.description,
                url=f"{frontend_url}/events",
            )
        except (OSError, ValueError) as exc:
            logger.error("Unable to send push notifications: %s", exc)
