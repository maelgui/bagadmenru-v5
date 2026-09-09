from typing import Annotated

from fastapi import Depends
from jinja2 import Environment, PackageLoader, select_autoescape
from pydantic import BaseModel, Field

from bbe2.config import Settings, get_settings
from bbe2.services.email import EmailAttachment, OutgoingEmail, send_emails


def get_templating() -> Environment:
    return Environment(loader=PackageLoader("bbe2"), autoescape=select_autoescape())


class EmailData(BaseModel):
    to: str
    template_data: dict
    attachments: list[EmailAttachment] = Field(default_factory=list)


class EmailSender:
    def __init__(
        self,
        settings: Annotated[Settings, Depends(get_settings)],
        template_env: Annotated[Environment, Depends(get_templating)],
    ):
        self.settings = settings
        self.template_env = template_env

    async def batch_send_emails(
        self,
        subject: str,
        template_name: str,
        template_data: list[EmailData],
    ):

        html_template = self.template_env.get_template(f"{template_name}.html")
        txt_template = self.template_env.get_template(f"{template_name}.txt")

        emails = [
            OutgoingEmail(
                subject=subject,
                to=d.to,
                body_text=txt_template.render(d.template_data),
                body_html=html_template.render(d.template_data),
                attachments=d.attachments,
            )
            for d in template_data
        ]

        await send_emails(self.settings, emails)
