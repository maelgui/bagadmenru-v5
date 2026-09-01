# Correction of Errors: Accidental Deletion of `bagadmenru-prod` Namespace

## Summary

On 2026-08-23 at ~12:00 (Europe/Paris), the entire `bagadmenru-prod` namespace of the Bagadmenru band application was accidentally deleted while the operator was attempting to quit the k9s terminal UI. An unknown k9s keyboard shortcut triggered a namespace deletion, removing the backend, frontend, PostgreSQL database, ingress, and TLS certificates. The application served ~40 users and had two active event polls created ~1 hour earlier, with 3–4 responses already submitted. The cluster was restored from a full VM backup (taken the prior night at ~23:00) within less than an hour, resulting in ~12 hours of lost data. The lost event had to be manually recreated and users asked to re-submit poll responses. Recovery succeeded only because a full-VM backup happened to exist; no Kubernetes-native or namespace-scoped backup was in place.

## Impact

- **Customers affected:** ~40 users of the Bagadmenru app.
- **Functional impact:** Complete outage of the production app — backend, frontend, database, ingress, and certificates all destroyed.
- **Active in-flight work lost:** Two event polls created ~1 hour before the incident, including 3–4 responses already submitted.
- **Duration of outage:** < 1 hour (deletion to full restore).
- **Data loss:** ~12 hours (last VM backup at ~23:00 the previous night → deletion at ~12:00). Occurred largely overnight, so real data lost was limited but non-zero — at least the newly created event and its early poll responses.
- **Follow-on manual effort:** ~1 hour of operator time plus recreating the deleted event and communicating with users to re-answer the polls.

## Timeline (Europe/Paris)

| Time | Event |
|---|---|
| 2026-08-22 ~23:00 | Last full VM backup taken (OVH). |
| 2026-08-23 ~11:00 | An event was created on the website; links sent to users. 3–4 users submit poll responses over the next hour. |
| 2026-08-23 ~12:00 | Operator, intending to quit k9s, hits an unknown shortcut that deletes the `bagadmenru-prod` namespace. Deletion confirmation message seen immediately. |
| 2026-08-23 ~12:00–12:0X | Operator inspects volumes for remaining files; confirms all resources are gone. |
| 2026-08-23 ~12:0X | Decision made to restore from the full VM backup via OVH admin panel. |
| 2026-08-23 ~13:00 | VM restore complete; application back online (< 1h total). |
| 2026-08-23 (after) | Deleted event manually recreated; users notified to re-submit poll responses. |

## 5 Whys — Root Cause Analysis

1. **Why did the app go down?** The entire `bagadmenru-prod` namespace was deleted, destroying all workloads, the database, ingress, and certs.
2. **Why was the namespace deleted?** An unintended k9s keyboard shortcut issued the deletion while the operator was trying to exit the tool.
3. **Why did an exit attempt delete a namespace?** The operator was unaware of that k9s binding, and k9s executed the destructive action on the currently selected namespace without a confirmation that clearly required intent (or the confirmation was easy to dismiss reflexively).
4. **Why was a single keystroke able to destroy production?** Daily operations were performed as cluster-admin, and there were no guardrails (admission policy or RBAC) preventing deletion of the production namespace.
5. **Why were there no guardrails, and why was recovery slow/lossy?** The cluster is a single-node k3s run by one operator with admin-everywhere access, no namespace deletion protection, and no Kubernetes-native/granular backup — the only safety net was a nightly full-VM backup, which is coarse (12h RPO) and not designed for this failure mode.

**Root causes:**

- Unrestricted destructive permissions in daily use (cluster-admin, no RBAC separation).
- No admission-level protection against deletion of the production namespace.
- No namespace-scoped or Kubernetes-native backup; sole recovery mechanism was a coarse nightly full-VM snapshot (12h RPO).
- A destructive tool action reachable via an unfamiliar keystroke with insufficient friction.

## Lessons Learned

**What went well**

- The full VM backup existed and OVH's restore was fast and easy (< 1h to recover).
- Impact window overlapped with low-traffic hours, limiting real data loss.
- Operator detected the mistake instantly (saw the confirmation) rather than discovering it later.

**What went wrong**

- Production could be destroyed by a single accidental keystroke.
- No layer between "operator error" and "total loss" — no policy, RBAC, or granular backup.

**Where we got lucky**

- Recovery depended entirely on a full-VM backup that happened to exist and happened to be recent enough — this was a fortunate save, not a designed safeguard for namespace loss.
- The incident occurred overnight relative to the backup, so 12h of "lost" data contained little real activity. Had it happened after a full day of event responses, the loss would have been far worse.

## Action Items

| # | Category | Action | Owner | Due |
|---|---|---|---|---|
| 1 | Prevention | Install Kyverno and add a `ClusterPolicy` that denies `DELETE` on the `bagadmenru-prod` namespace, requiring the policy to be explicitly removed for an intentional deletion. | [you] | [date] |
| 2 | Prevention | Stop using cluster-admin for daily work. Create a limited kubeconfig/role without namespace `delete` and reserve admin for deliberate use. | [you] | [date] |
| 3 | Prevention | Review k9s configuration — disable or remap the destructive shortcut, and/or set k9s to require typed confirmation for deletes. Learn the exit binding. | [you] | [date] |
| 4 | Mitigation | Deploy Velero with a local/MinIO (or OVH Object Storage) backend and schedule daily namespace-scoped backups of `bagadmenru-prod`, enabling granular restore without a full-VM rollback. | [you] | [date] |
| 5 | Mitigation | Reduce RPO: increase backup frequency for the PostgreSQL data (e.g., periodic `pg_dump` or WAL archiving) so worst-case loss is minutes, not 12 hours. | [you] | [date] |
| 6 | Detection | Add an alert on sudden drops in namespace/pod count (or namespace-absent check) so accidental deletion is flagged immediately even if the confirmation is missed. | [you] | [date] |
| 7 | Prevention/Recovery | Confirm the GitOps repo (GitHub Actions + kubectl) fully describes `bagadmenru-prod` so the namespace and workloads self-recreate from Git; consider Argo CD/Flux for automatic drift-healing. | [you] | [date] |
