from typing import Annotated

from bbe2.utils.templates import get_templating
from fastapi import Depends
from jinja2 import Environment
from sqlalchemy.orm import Session

from bbe2.config import Settings, get_settings
from bbe2.database import get_session
#from bbe2.utils.auth import get_current_user
from bbe2.utils.s3 import S3Helper

SessionDep = Annotated[Session, Depends(get_session)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
#CurrentUser = Annotated[str, Depends(get_current_user)]
S3Dep = Annotated[S3Helper, Depends(S3Helper)]
TemplateDep = Annotated[Environment, Depends(get_templating)]
