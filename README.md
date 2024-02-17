# Site web du Bagad Men Ru

## Développement

#### Lancement projet

```
# Setup frontend dependencies
docker compose run frontend yarn
# Start project
docker compose up
```

#### Première configuration

**Keycloak**

Ouvrir keycloak, se connecter avec les identificants `admin:admin`, changer le reaml de master à bagadmenru, aller dans clients/bbe-frontend, et changer la root url par le résultats de la commande suivante :

```
echo https://${CODESPACE_NAME}-5173.app.github.dev
```

Aller ensuite dans users et créer un utilisateur, ajouter le au groupe bagad, et créer lui un mot de passe.

**S3**

Aller dans minio (port 9000), connecter vous `minioadmin:minioadmin`, et créer le bucket `mybucket`.

Redémarrer le backend (docker compose restart backend)