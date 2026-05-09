"""Background notification tasks.

These functions are designed to be used with FastAPI BackgroundTasks.
They only receive plain/serializable data (no ORM objects).
"""

import logging

from itsdangerous import URLSafeTimedSerializer
from sqlalchemy import select

from bbe2.config import Settings
from bbe2.database import session_ctx
from bbe2.models.user import UserDB
from bbe2.schemas.event import EventCreate
from bbe2.services.push_service import send_push_to_users
from bbe2.utils.auth import Action, ActionTokenValue
from bbe2.utils.permissions import Resource, is_allowed
from bbe2.utils.templates import EmailData, EmailSender

logger = logging.getLogger(__name__)


async def notify_new_event(
    sender: EmailSender,
    settings: Settings,
    event: EventCreate,
    event_id: int,
) -> None:
    """Background task: send email + push notifications for a new event.

    Args:
        event: The EventCreate schema (Pydantic model with title, description, date, costume, etc.)
        event_id: The database ID of the created event.

    Fetches eligible users from the database using its own session.
    """
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

        token_serializer = URLSafeTimedSerializer(settings.token_secret_key)
        frontend_url = str(settings.frontend_base_url).rstrip("/")

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
                            "token": token_serializer.dumps(
                                {
                                    "user_id": user.id,
                                    "event_id": event_id,
                                    "action": ActionTokenValue.CreateResponseByToken.value,
                                }
                            ),
                            "unsubscribe_token": token_serializer.dumps(
                                {
                                    "user_id": user.id,
                                    "action": ActionTokenValue.Unsubscribe.value,
                                }
                            ),
                        },
                    )
                    for user in users
                ],
            )
        except Exception as exc:
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
