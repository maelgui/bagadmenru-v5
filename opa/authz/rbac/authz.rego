package authz.rbac

import rego.v1

# this is provided as data!
# regal ignore:unresolved-import
import data.authz.rbac.permissions as p

role_permissions := {
	"eleves": [
		p.can_view_me,
		p.can_edit_me,
		p.can_view_event,
		p.can_view_profile,
		p.can_view_file,
	],
	"intervenants": [
		p.can_view_me,
		p.can_edit_me,
		p.can_view_file,
	],
	"bagad": [
		p.can_view_me,
		p.can_edit_me,
		p.can_view_event,
		p.can_view_response,
		p.can_create_response,
		p.can_view_profile,
		p.can_view_file,
	],
	"staff": [
		p.can_view_me,
		p.can_edit_me,
		p.can_view_event,
		p.can_view_response,
		p.can_create_response,
		p.can_view_profile,
		p.can_view_file,
		p.can_create_file,
		p.can_edit_file,
		p.can_create_event,
		p.can_edit_event,
		p.can_create_profile,
		p.can_edit_profile,
		p.can_view_email,
	],
}

default allow := false

allow if {
	"admin" in input.user.roles
}

allow if {
	some role in input.user.roles
	some perm in role_permissions[role]
	perm == {"action": input.action, "resource": input.resource}
}
