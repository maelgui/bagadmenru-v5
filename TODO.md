# Feature Backlog

## 1. Event Campaigns (Grouping Events)

- [ ] Create a `Campaign` model (name, description, date range, status)
- [ ] Link events to campaigns (many-to-one: an event belongs to one campaign)
- [ ] Campaign CRUD endpoints
- [ ] Frontend: campaign list view, campaign detail showing its events
- [ ] Examples: "Sortie 2025", "Répé concours", "Répé printemps", "Sondage répé pour préparer la sortie du 15 juillet"

## 2. Event Visibility by Group

- [ ] Confirm current group/event relationship in the DB
- [ ] Add a many-to-many `event_groups` table (or `campaign_groups`) to control which groups see which events/campaigns
- [ ] Enforce visibility in the API (filter events by user's groups)
- [ ] Frontend: show/hide events based on group membership
- [ ] Admin UI: assign groups when creating/editing an event or campaign

## 3. Multi-Tenancy

- [ ] Define what "tenant" means — separate bagadoù? Separate sections within one bagad?
- [ ] **Feasibility**: yes, possible. Options:
  - *Schema-per-tenant* (separate DB schemas): strong isolation, harder migrations
  - *Row-level tenancy* (shared tables + `tenant_id` column): simpler infra, careful query filtering
  - *Separate deployments*: easiest isolation, highest infra cost
- [ ] For a single-bagad app with sections/groups, row-level filtering on `group_id` might already suffice
- [ ] Decision needed: single-ensemble focus vs. platform for multiple ensembles?

## 4. Proper OAuth

- [ ] Current auth: JWT + WebAuthn passkeys (custom `auth-provider/`)
- [ ] Move to a standard OAuth 2.0 / OpenID Connect flow
- [ ] Options to evaluate:
  - [ ] Self-hosted: Keycloak, Authentik, or Authelia
  - [ ] Managed: Auth0, AWS Cognito, or Zitadel (open-source + cloud)
- [ ] Implement Authorization Code flow with PKCE for the SPA
- [ ] Migrate existing users/credentials
- [ ] Scopes & roles: map current group-based permissions to OAuth scopes
- [ ] Keep WebAuthn as a login method within the OAuth provider

---

## Priority Notes

**Campaigns** are the most self-contained feature — ship without touching auth or tenancy. Start here.

**Event visibility by group** is a natural extension of campaigns — small schema + API change given groups already exist.

**Multi-tenancy** is a big architectural decision. If the goal is "one bagad, multiple sections with different access," the existing group system already covers that. True multi-tenancy (serving multiple bagadoù) is a different beast.

**OAuth** is valuable but high-effort (migration, new infra). Pragmatic path: deploy Keycloak/Authentik alongside current auth, migrate gradually, keep passkeys as a first-class login method inside the provider.
