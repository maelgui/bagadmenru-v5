# Runbook: VAPID Key Rotation

The VAPID keypair signs every Web Push message. Rotate it when the private
key is (or may be) compromised — e.g. it was committed to git — or as
periodic hygiene.

**Impact of a rotation:** every existing push subscription is bound to the
old public key and dies with it. This is self-healing since
`feat/vapid-rotation-support`:

- **Backend** prunes a subscription on the first failed delivery (the push
  service answers 401/403 for a key mismatch, 404/410 for expired ones).
- **Frontend** detects, next time a member toggles push notifications, that
  the browser subscription is bound to a stale key, drops it and re-creates
  one under the current key (`subscriptionMatchesServerKey` in
  `frontend/app/src/utils/usePushNotifications.ts`).

What is NOT automatic: members do not get re-subscribed silently. They stop
receiving pushes until they re-enable them in **Réglages → Notifications**.
Announce the rotation (email/event) if push delivery matters at that time.

## 1. Generate the new keypair

```bash
npx web-push generate-vapid-keys
# → gives urlsafe-base64 "Public Key" and "Private Key"
```

(Alternative without Node: `vapid --gen` from the `py_vapid` package.)

Never commit either value. The private key must only ever exist in the
sealed secrets and your password manager.

## 2. Seal the new keys (beta AND prod)

Requires cluster access (`kubeseal` fetches the controller's public cert).
The sealed-secrets files hold ALL backend secrets, so re-seal the full
secret with the unchanged values plus the two new VAPID entries — see the
complete `kubectl create secret … | kubeseal` template in `k8s/README.md`.

```bash
# For each of beta and prod:
kubectl create secret generic backend-secrets \
  --namespace=bagadmenru-<env> \
  --from-literal=VAPID_PRIVATE_KEY='<new private key>' \
  --from-literal=VAPID_PUBLIC_KEY='<new public key>' \
  # …all other existing --from-literal entries, unchanged… \
  --dry-run=client -o yaml | kubeseal --format yaml \
  > k8s/overlays/<env>/sealed-secrets.yaml
```

Commit both files and let the pipeline deploy (beta first; prod follows the
e2e gate).

## 3. Local development

Local push testing needs its own throwaway pair (compose reads both halves
from the environment):

```bash
export VAPID_PRIVATE_KEY='<dev private>'
export VAPID_PUBLIC_KEY='<dev public>'
docker compose up
```

Unset, push notifications are disabled locally (backend logs a warning) —
everything else works.

## 4. Verify

1. `GET /api/v1/push/vapid-public-key` on the environment returns the NEW
   public key.
2. Re-enable push on one device (Réglages → Notifications: off, then on) and
   send yourself a test notification.
3. Watch the `bbe2_push_sends_total{outcome="expired"}` counter: a burst
   after rotation is the cleanup of old-key subscriptions doing its job.

## History note (2026-09)

The pair whose public key starts with `BEibjIo7p3zT…` was committed to git
(compose file, commit `fc539a1`) and must be considered public forever: the
repo history is planned to become public. That pair was rotated away; never
re-use it.

The 2026-09-16 rotation was done with `kubeseal --raw` (strict scope,
`backend-secrets` / target namespace), which seals individual values without
needing to read the existing Secret — the only cluster access required is
fetching the controller's public cert. Beta and prod now use two distinct
keypairs.
