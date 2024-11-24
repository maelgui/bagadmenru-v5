package bbe2.policies

import rego.v1

import data.permissions as p

default allow := false

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
		p.can_create_response,
		p.can_view_profile,
		p.can_view_file,
	]
}

allow if {
    "admin" in input.user.roles
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

allow if {
	some role in input.user.roles
	some perm in role_permissions[role]
    perm == {"action": input.action, "resource": input.resource}
}
