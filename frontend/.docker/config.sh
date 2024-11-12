#!/bin/sh

envsubst < /app-config.js.template > /usr/share/nginx/html/app-config.js

exec "$@"
