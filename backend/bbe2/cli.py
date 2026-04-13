import os
from time import sleep

import typer
from rich.console import Console
from rich.table import Table
from sqlalchemy import insert, select

from bbe2 import models
from bbe2.database import session_ctx
from bbe2.models.user import RoleDB
from bbe2.utils.auth import myctx

console = Console()
users_cli = typer.Typer()


DB_URL = os.environ["DATABASE_URL"]


@users_cli.command("list", help="List users")
def list_users():
    with session_ctx(DB_URL) as s:
        users = s.scalars(select(models.UserDB)).all()

        table = Table("Firstname", "Lastname", "Email")
        for user in users:
            table.add_row(user.first_name, user.last_name, user.email)

        console.print(table)


@users_cli.command("create", help="List users")
def create_user():
    first_name = typer.prompt("What's your first name?")
    last_name = typer.prompt("What's your last name?")
    email = typer.prompt("What's your email?")
    password = typer.prompt("What's your password?", hide_input=True)

    with session_ctx(DB_URL) as s:
        result = s.execute(
            insert(models.UserDB).values(
                first_name=first_name,
                last_name=last_name,
                email=email,
                password=myctx.hash(password),
            )
        )
    print(result)


roles_cli = typer.Typer()


@roles_cli.command("list", help="List roles")
def list_roles():
    with session_ctx(DB_URL) as s:
        roles = s.scalars(select(models.RoleDB)).all()

        table = Table("Role", "Description")
        for role in roles:
            table.add_row(role.id, role.description)

        console.print(table)


app = typer.Typer()
app.add_typer(users_cli, name="users", help="Manage users CLI")
app.add_typer(roles_cli, name="roles", help="Manage roles CLI")


@app.command()
def hello(name: str):
    print(f"Hello {name}")


@app.command("bootstrap", help="Bootstrap default data")
def bootstrap():
    with console.status("Bootstraping data"), session_ctx(DB_URL) as s:
        default_roles = [
            RoleDB(id="admin", description="Administrateur"),
            RoleDB(
                id="bagad",
                description="Voit les partitions et peut répondre aux évènements",
            ),
            RoleDB(id="eleves", description="Voit les partitions et évènements"),
            RoleDB(id="intervenants", description="Voit seulement les partitions"),
            RoleDB(id="staff", description="Presque un administrateur"),
        ]
        for role in default_roles:
            s.merge(role)
        s.commit()
        console.log("Default roles created")
        sleep(3)
        s.merge(
            models.GroupDB(
                id=1, name="Administrateur", color="#000", roles=[default_roles[0]]
            )
        )
        console.log("Admin group created")

        # Create or update the default group that every user belongs to
        default_group = s.scalars(
            select(models.GroupDB).filter_by(name="Membres")
        ).first()
        if default_group:
            default_group.is_default = True
            console.log(f"Existing 'Membres' group (id={default_group.id}) marked as default")
        else:
            default_group = models.GroupDB(
                name="Membres",
                color="#3498db",
                is_default=True,
                roles=[],
            )
            s.add(default_group)
            console.log("Default 'Membres' group created")
    console.print("[bold green]Bootstrap successfully")


if __name__ == "__main__":
    app()
