from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import sessionmaker

from bbe2 import models
from bbe2.database import get_engine, strip_accents
from bbe2.models.base import Base
from bbe2.schemas import Costume, FileOrFolderType
from bbe2.schemas.auth import JwtPayload
from bbe2.services.search import SearchService
from bbe2.utils.auth import AuthContext

DATABASE_URL = "sqlite:///tests_services_search.sqlite?check_same_thread=false"


def _auth(roles: list[str], key_permissions: frozenset[str] | None = None) -> AuthContext:
    now = datetime.now(tz=timezone.utc)
    payload = JwtPayload(
        sub="u1",
        roles=roles,
        first_name="Mael",
        last_name="Gui",
        iat=now,
        exp=now + timedelta(minutes=5),
    )
    return AuthContext(payload=payload, key_permissions=key_permissions)


STAFF = _auth(["staff"])


def _event(event_id: int, title: str, description: str, day: date) -> models.EventDB:
    return models.EventDB(
        id=event_id,
        title=title,
        description=description,
        date=day,
        costume=Costume.NONE,
        category="TEST",
        is_in_doodle=True,
    )


def _user(user_id: str, first: str, last: str, is_active: bool = True) -> models.UserDB:
    return models.UserDB(
        id=user_id,
        email=f"{user_id}@example.com",
        first_name=first,
        last_name=last,
        instrument_id=1,
        is_active=is_active,
    )


def _node(
    node_id: int, name: str, parent_id: int | None, node_type: FileOrFolderType
) -> models.FileOrFolderDB:
    return models.FileOrFolderDB(
        id=node_id, name=name, parent_id=parent_id, type=node_type
    )


def _session():
    engine = get_engine(DATABASE_URL)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    session.add(models.GroupDB(id=1, name="Bombarde", color="#fff"))
    session.add_all(
        [
            _user("u1", "Maël", "Guillou"),
            _user("u2", "Élodie", "Le Gall"),
            _user("u3", "Yann", "Guillou", is_active=False),
        ]
    )
    session.add_all(
        [
            _event(1, "Fête de la Saint-Yves", "Défilé en ville", date(2026, 5, 19)),
            _event(2, "Répétition générale", "Avant la fête", date(2026, 5, 10)),
            _event(3, "Concert", "Fest-noz à Lorient", date(2025, 8, 1)),
        ]
    )
    session.add_all(
        [
            _node(1, "root", None, FileOrFolderType.DIRECTORY),
            _node(2, "Partitions", 1, FileOrFolderType.DIRECTORY),
            _node(3, "Bombarde", 2, FileOrFolderType.DIRECTORY),
            _node(4, "Suite de Loudéac.pdf", 3, FileOrFolderType.FILE),
            _node(5, "Loudéac.mscz", 3, FileOrFolderType.CONTAINER),
            _node(6, "Loudéac.pdf", 5, FileOrFolderType.FILE),
            _node(7, "An Dro de Loudéac.mp3", 1, FileOrFolderType.FILE),
        ]
    )
    session.commit()
    return session


def test_strip_accents():
    assert strip_accents("Fête à Loudéac") == "Fete a Loudeac"
    assert strip_accents(None) is None


def test_accent_and_case_insensitive_matching():
    service = SearchService(_session())

    results = service.search("fete", STAFF, limit=8)

    assert [e.title for e in results.events] == [
        "Fête de la Saint-Yves",
        "Répétition générale",
    ]


def test_every_token_must_match():
    service = SearchService(_session())

    results = service.search("fete ville", STAFF, limit=8)

    assert [e.title for e in results.events] == ["Fête de la Saint-Yves"]


def test_blank_query_returns_nothing():
    service = SearchService(_session())

    results = service.search("   ", STAFF, limit=8)

    assert results.events == [] and results.profiles == [] and results.files == []


def test_profiles_match_name_or_email_and_skip_inactive():
    service = SearchService(_session())

    by_name = service.search("guillou", STAFF, limit=8)
    by_email = service.search("u2@example", STAFF, limit=8)

    assert [p.id for p in by_name.profiles] == ["u1"]
    assert [p.id for p in by_email.profiles] == ["u2"]


def test_prefix_match_ranks_first():
    service = SearchService(_session())

    results = service.search("loudeac", STAFF, limit=8)

    assert [h.file.name for h in results.files] == [
        "Loudéac.mscz",
        "An Dro de Loudéac.mp3",
        "Suite de Loudéac.pdf",
    ]


def test_file_hits_carry_their_folder_path_and_skip_container_children():
    service = SearchService(_session())

    results = service.search("loudeac", STAFF, limit=8)
    by_name = {h.file.name: h for h in results.files}

    assert by_name["Suite de Loudéac.pdf"].path == ["Partitions", "Bombarde"]
    assert by_name["Loudéac.mscz"].path == ["Partitions", "Bombarde"]
    assert by_name["An Dro de Loudéac.mp3"].path == []
    assert "Loudéac.pdf" not in by_name


def test_limit_applies_per_kind():
    service = SearchService(_session())

    results = service.search("loudeac", STAFF, limit=1)

    assert len(results.files) == 1


def test_like_wildcards_are_literal():
    service = SearchService(_session())

    results = service.search("%", STAFF, limit=8)

    assert results.files == [] and results.events == [] and results.profiles == []


def test_sections_follow_role_permissions():
    service = SearchService(_session())

    results = service.search("bombarde", _auth(["intervenants"]), limit=8)

    assert [h.file.name for h in results.files] == ["Bombarde"]
    assert results.profiles == []
    assert results.events == []


def test_sections_follow_api_key_permissions():
    service = SearchService(_session())

    results = service.search(
        "guillou", _auth(["staff"], frozenset({"view:profile"})), limit=8
    )

    assert [p.id for p in results.profiles] == ["u1"]
    assert results.files == []
    assert results.events == []
