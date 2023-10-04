from pydantic import BaseModel


class GetUploadUrlResponse(BaseModel):
    url: str
    key: str
