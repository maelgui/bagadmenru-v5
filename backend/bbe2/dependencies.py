from typing import Annotated

from fastapi import Depends
from jinja2 import Environment
from sqlalchemy.orm import Session

from bbe2.config import Settings, get_settings
from bbe2.database import get_session

# from bbe2.utils.auth import get_current_user
from bbe2.utils.s3 import S3Helper
from bbe2.utils.templates import get_templating

SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
S3Dep = Annotated[S3Helper, Depends(S3Helper)]
TemplateDep = Annotated[Environment, Depends(get_templating)]
