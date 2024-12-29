package bbe2.authz

import rego.v1

import data.permissions as p

default allow := false

allow if {
    "admin" in input.user.roles
}

role_permissions := {
	"eleves": [
		p.can_view_me,
		p.can_view_event,
		p.can_view_profile,
		p.can_view_file,
	],
	"intervenants": [
		p.can_view_me,
		p.can_view_file,
	],
	"bagad": [
		p.can_view_me,
		p.can_view_event,
		p.can_view_response,
		p.can_create_response,
		p.can_view_profile,
		p.can_view_file,
	],
	"manager": [
		p.can_view_me,
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
	]
}

# allow if {
# 	count(data.endpoints[input.path][input.method]) == 0
# }

# allow if {
# 	some path, methods in data.endpoints
# 	glob.match(path, ["/"], input.path)
# 	some role in input.user_roles
# 	role in methods[input.method]
# }

# role_permissions := {"blabal": ["dqd", p.can_view_me]}
allow if {
	some role in input.user.roles
	print("User Roles", role, role_permissions)
	some perm in role_permissions[role]
	print("Checking perm", perm)
    perm == {"action": input.action, "resource": input.resource}
}
