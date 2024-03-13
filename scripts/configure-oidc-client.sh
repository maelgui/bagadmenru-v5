#!/bin/sh

ACCESS_TOKEN=$(curl -X POST \
    --header 'Content-Type: application/x-www-form-urlencoded' \
    --user $KEYCLOAK_REGISTRATION_CLIENT_ID:$KEYCLOAK_REGISTRATION_SECRET \
    --data-urlencode 'grant_type=client_credentials' \
    https://auth.beta.bagadmenru.bzh/realms/bagadmenru/protocol/openid-connect/token \
    | jq -r .access_token)


curl -X POST \
    -d '{ "clientId": "bbe2-frontend-'"$CODESPACE_NAME"'", "redirectUris": ["https://'"$CODESPACE_NAME"'-5173.'"$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"'/authentication/callback"] }' \
    -H "Content-Type: application/json" \
    -H "Authorization: bearer $ACCESS_TOKEN" \
    https://auth.beta.bagadmenru.bzh/realms/bagadmenru/clients-registrations/default
