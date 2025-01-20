import logging
import os


def get_logger():
    stage: str = os.environ.get("STAGE", "unknown")

    logger = logging.getLogger(__name__)

    log_level = logging.INFO

    if stage != "prod":
        log_level = logging.DEBUG

    logger.setLevel(level=log_level)

    return logger
