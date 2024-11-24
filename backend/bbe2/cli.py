import os
from contextlib import contextmanager

import typer
from rich.console import Console
from rich.table import Table
from sqlalchemy import create_engine, insert, select

from bbe2 import models
from bbe2.database import SessionLocal, get_engine
from bbe2.utils.auth import myctx

console = Console()
users = typer.Typer()


@contextmanager
def session():
    # Code to acquire resource, e.g.:
    engine = get_engine(os.environ["DATABASE_URL"])
    SessionLocal.configure(bind=engine)
    with engine.connect() as conn:
        yield conn
        conn.commit()


@users.command("list", help="List users")
def list_users():
    with session() as s:
        users = s.scalars(select(models.User)).all()

    table = Table("Firstname", "Lastname", "Email")
    for user in users:
        table.add_row(user.first_name, user.last_name, user.email)

    console.print(table)


@users.command("create", help="List users")
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


roles = typer.Typer()


@roles.command("list", help="List roles")
def list_roles():
    with session() as s:
        roles = s.execute(select(models.Role)).all()

    table = Table("Role", "Description")
    for role in roles:
        table.add_row(role.id, role.description)

    console.print(table)


@roles.command("sync", help="Synchronize roles")
def sync_roles():
    with session() as s:
        s.execute(
            insert(models.Role).values(
                [
                    {"id": "admin", "description": "Administrateur"},
                    {"id": "bagad", "description": "Bagad"},
                    {"id": "eleves", "description": "Eleves"},
                    {"id": "intervenants", "description": "Profs"},
                ]
            )
        )
    print("Roles synchronized")


app = typer.Typer()
app.add_typer(users, name="users", help="Manage users CLI")
app.add_typer(roles, name="roles", help="Manage roles CLI")


@app.command()
def hello(name: str):
    print(f"Hello {name}")


if __name__ == "__main__":
    app()
