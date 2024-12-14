from typing import Annotated

from fastapi import Depends
from jinja2 import Environment
from sqlalchemy.orm import Session

from bbe2.config import Settings, get_settings
from bbe2.database import get_session
from bbe2.schemas.file import FileOrFolder
from bbe2.schemas.profile import Profile
from bbe2.utils.s3 import S3Helper
from bbe2.utils.templates import EmailSender, get_templating


# Dependency class
def get_s3_helper(settings: Annotated[Settings, Depends(get_settings)]) -> S3Helper:
    s3 = S3Helper(settings)
    Profile.s3_helper = s3
    FileOrFolder.s3_helper = s3
    return s3


SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
S3Dep = Annotated[S3Helper, Depends(get_s3_helper)]
TemplateDep = Annotated[Environment, Depends(get_templating)]
SenderDep = Annotated[EmailSender, Depends(EmailSender)]
