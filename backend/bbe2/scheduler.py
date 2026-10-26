from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select

from bbe2.config import get_settings
from bbe2.database import session_ctx
from bbe2.models import GroupDB
from bbe2.services import mailing as mailing_service
from bbe2.services import membership as membership_service
from bbe2.services.files import purge_superseded_versions
from bbe2.utils import get_logger
from bbe2.utils.action_token import purge_expired_action_tokens
from bbe2.utils.s3 import S3Helper

scheduler = AsyncIOScheduler()

logger = get_logger()


def expected_emails(group: GroupDB) -> set[str]:
    return set(m.email for m in group.members if m.receives_emails and m.is_active)


async def run_group_sync(settings, session, group: GroupDB) -> None:
    assert group.mailing_list is not None
    try:
        await mailing_service.sync_mailing_list(
            settings,
            group.mailing_list,
            mailing_service.DOMAIN,
            expected_emails(group),
        )
        group.mailing_list_synced_at = datetime.now(tz=timezone.utc)
        group.mailing_list_sync_error = None
    except Exception as exc:  # pylint: disable=broad-exception-caught
        logger.exception("Mailing list sync failed for group %s", group.name)
        group.mailing_list_sync_error = str(exc)
    session.commit()


@scheduler.scheduled_job("cron", hour="*/3", minute="30")
async def synchronize_mailing_lists():
    settings = get_settings()
    with session_ctx(settings.database_url) as ses:
        logger.info("Retriveing groups")
        query = select(GroupDB).where(GroupDB.mailing_list.is_not(None))
        groups = ses.scalars(query).all()
        for group in groups:
            logger.info("Processing group %s#%s", group.id, group.name)
            await run_group_sync(settings, ses, group)


@scheduler.scheduled_job("cron", hour="4")
async def daily_cleanup():
    settings = get_settings()
    with session_ctx(settings.database_url) as ses:
        memberships = membership_service.purge_unlinked_memberships(
            ses, ttl_days=settings.unlinked_membership_ttl_days
        )
        logger.info("Unlinked membership purge complete: %d deleted", memberships)

        tokens = purge_expired_action_tokens(
            ses, grace_days=settings.action_token_ttl_days
        )
        logger.info("Action token purge complete: %d deleted", tokens)

        versions = purge_superseded_versions(
            ses,
            S3Helper(settings),
            retention_days=settings.file_version_retention_days,
        )
        logger.info("File version purge complete: %d purged", versions)
