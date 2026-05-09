import os

import typer
from rich.console import Console
from rich.table import Table
from sqlalchemy import insert, select
from sqlalchemy.orm import Session

from bbe2 import models
from bbe2.config import Environment
from bbe2.database import session_ctx
from bbe2.models.user import (
    GroupDB,
    RoleDB,
    UserDB,
)
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


def _bootstrap(s: Session) -> None:
    """Bootstrap default roles and groups (idempotent). Shared logic."""
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
        console.log(
            f"Existing 'Membres' group (id={default_group.id}) marked as default"
        )
    else:
        default_group = models.GroupDB(
            name="Membres",
            color="#3498db",
            is_default=True,
            roles=[],
        )
        s.add(default_group)
        console.log("Default 'Membres' group created")
    s.commit()


@app.command("bootstrap", help="Bootstrap default data")
def bootstrap():
    with console.status("Bootstraping data"), session_ctx(DB_URL) as s:
        _bootstrap(s)
    console.print("[bold green]Bootstrap successfully")


# ---------------------------------------------------------------------------
# E2E seed data constants
# ---------------------------------------------------------------------------
E2E_USER_ID = "e2e-user-00000000"
E2E_ADMIN_ID = "e2e-admin-00000000"
E2E_USER_EMAIL = "e2e@bagadmenru.bzh"
E2E_ADMIN_EMAIL = "e2e-admin@bagadmenru.bzh"
E2E_USER_PASSWORD = "E2eTest1234!"
E2E_ADMIN_PASSWORD = "E2eAdmin1234!"


@app.command("seed-e2e", help="Seed E2E test data (runs bootstrap first, idempotent)")
def seed_e2e():
    environment = os.environ.get("ENVIRONMENT", Environment.DEVELOPMENT.value)
    if environment == Environment.PRODUCTION.value:
        console.print("[bold red]Refusing to seed E2E data in production![/bold red]")
        raise typer.Exit(1)

    with console.status("Seeding E2E data"), session_ctx(DB_URL) as s:
        # 1. Run bootstrap to ensure roles and default groups exist
        _bootstrap(s)
        console.log("Bootstrap complete")

        # 3. Create E2E groups with appropriate roles
        admin_role = s.get(RoleDB, "admin")
        bagad_role = s.get(RoleDB, "bagad")
        eleves_role = s.get(RoleDB, "eleves")

        e2e_admin_group = s.scalars(
            select(GroupDB).filter_by(name="E2E Admins")
        ).first()
        if not e2e_admin_group:
            e2e_admin_group = GroupDB(
                name="E2E Admins", color="#e74c3c", roles=[admin_role]
            )
            s.add(e2e_admin_group)
            s.flush()
            console.log("E2E Admins group created")

        e2e_member_group = s.scalars(
            select(GroupDB).filter_by(name="E2E Members")
        ).first()
        if not e2e_member_group:
            e2e_member_group = GroupDB(
                name="E2E Members", color="#2ecc71", roles=[bagad_role, eleves_role]
            )
            s.add(e2e_member_group)
            s.flush()
            console.log("E2E Members group created")

        # 4. Create E2E users
        e2e_user = s.get(UserDB, E2E_USER_ID)
        if not e2e_user:
            e2e_user = UserDB(
                id=E2E_USER_ID,
                email=E2E_USER_EMAIL,
                password=myctx.hash(E2E_USER_PASSWORD),
                first_name="E2E",
                last_name="User",
                is_active=True,
            )
            e2e_user.groups = [e2e_member_group]
            s.add(e2e_user)
            console.log(f"E2E user created: {E2E_USER_EMAIL}")
        else:
            console.log(f"E2E user already exists: {E2E_USER_EMAIL}")

        e2e_admin = s.get(UserDB, E2E_ADMIN_ID)
        if not e2e_admin:
            e2e_admin = UserDB(
                id=E2E_ADMIN_ID,
                email=E2E_ADMIN_EMAIL,
                password=myctx.hash(E2E_ADMIN_PASSWORD),
                first_name="E2E",
                last_name="Admin",
                is_active=True,
            )
            e2e_admin.groups = [e2e_admin_group]
            s.add(e2e_admin)
            console.log(f"E2E admin created: {E2E_ADMIN_EMAIL}")
        else:
            console.log(f"E2E admin already exists: {E2E_ADMIN_EMAIL}")

        s.commit()

    console.print("[bold green]✓ E2E data seeded successfully[/bold green]")


if __name__ == "__main__":
    app()
