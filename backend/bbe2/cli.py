import os
from contextlib import contextmanager
from time import sleep

import typer
from rich.console import Console
from rich.table import Table
from sqlalchemy import insert, select

from bbe2 import models
from bbe2.database import SessionLocal, get_engine
from bbe2.models.user import Role
from bbe2.utils.auth import myctx

console = Console()
users_cli = typer.Typer()


@contextmanager
def session():
    # Code to acquire resource, e.g.:
    engine = get_engine(os.environ["DATABASE_URL"])
    SessionLocal.configure(bind=engine)
    with SessionLocal() as s:
        yield s
        s.commit()
        s.close()


@users_cli.command("list", help="List users")
def list_users():
    with session() as s:
        users = s.scalars(select(models.User)).all()

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

    with session() as s:
        result = s.execute(
            insert(models.User).values(
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
    with session() as s:
        roles = s.scalars(select(models.Role)).all()

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
    with console.status("Bootstraping data"), session() as s:
        default_roles = [
            Role(id="admin", description="Administrateur"),
            Role(
                id="bagad",
                description="Voit les partitions et peut répondre aux évènements",
            ),
            Role(id="eleves", description="Voit les partitions et évènements"),
            Role(id="intervenants", description="Voit seulement les partitions"),
        ]
        for role in default_roles:
            s.merge(role)
        s.commit()
        console.log("Default roles created")
        sleep(3)
        s.merge(
            models.Group(
                id=1, name="Administrateur", color="#000", roles=[default_roles[0]]
            )
        )
        console.log("Admin group created")
    console.print("[bold green]Bootstrap successfully")


if __name__ == "__main__":
    app()
