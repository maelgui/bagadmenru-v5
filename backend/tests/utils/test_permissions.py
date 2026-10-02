from bbe2.utils.permissions import Action, Resource, is_allowed


def test_staff_can_delete_profile():
    assert is_allowed(["staff"], Action.DELETE, Resource.PROFILE)


def test_staff_can_create_and_edit_profile():
    assert is_allowed(["staff"], Action.CREATE, Resource.PROFILE)
    assert is_allowed(["staff"], Action.EDIT, Resource.PROFILE)


def test_admin_can_delete_profile():
    assert is_allowed(["admin"], Action.DELETE, Resource.PROFILE)


def test_non_staff_roles_cannot_delete_profile():
    for role in ("eleves", "bagad", "intervenants"):
        assert not is_allowed([role], Action.DELETE, Resource.PROFILE)
