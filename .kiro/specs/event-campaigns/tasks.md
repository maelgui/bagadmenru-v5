# Implementation Plan: Event Campaigns (v2 Migration)

## Overview

This plan migrates the fully implemented v1 Event Campaigns feature to the v2 design. It modifies existing code rather than building from scratch. The main changes: campaign dates are dropped in favor of a date range derived from linked events, creation is simplified to name + group with a server-enforced "draft" status, the lifecycle becomes strictly one-way (draft → active → archived) via dedicated publish/archive endpoints, draft campaigns and their events are hidden from non-managers across all views, and new-event notifications are deferred until publish for draft-campaign events.

Backend: Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, pytest + Hypothesis. Frontend: React 19, TypeScript, React Query, react-hook-form + Zod, with the auto-generated bagad-client (regenerated after the backend changes).

## Tasks

- [x] 1. Update Campaign data model and migration
  - [x] 1.1 Remove start_date and end_date from the CampaignDB model
    - Edit `backend/bbe2/models/campaign.py`: delete the `start_date` and `end_date` mapped columns
    - Keep id, name (String 150), description, status (default "draft"), group_id, created_at, and the group/events relationships unchanged
    - `EventDB.campaign_id` (nullable FK, ON DELETE SET NULL) is unchanged from v1
    - _Requirements: 13.1, 13.2, 13.4, 13.6_

  - [x] 1.2 Create the Alembic migration dropping the date columns
    - New revision that drops `campaigns.start_date` and `campaigns.end_date` in `upgrade()`
    - `downgrade()` re-adds `start_date` as NOT NULL with a `server_default=sa.func.current_date()` (then clears the default) and `end_date` as nullable, so downgrade succeeds on populated tables
    - No data backfill: dropping the v1 date guesses is intentional
    - _Requirements: 13.3_

- [x] 2. Update Pydantic schemas
  - [x] 2.1 Rework campaign schemas for v2
    - Edit `backend/bbe2/schemas/campaign.py`
    - `CampaignCreate`: name (max_length=150), optional description, group_id only — no status, no dates
    - `CampaignUpdate`: optional name/description/group_id only — no status field
    - Remove the `model_validator` date range validation entirely
    - `CampaignListItem` and `Campaign`: add derived `first_event_date: Optional[date]` and `last_event_date: Optional[date]` fields (None when no linked events); drop start_date/end_date
    - _Requirements: 1.2, 1.3, 1.5, 4.2, 13.7_

  - [x] 2.2 Add optional campaign_id to event schemas
    - Edit `backend/bbe2/schemas/event.py`: `EventCreate` gains `campaign_id: Optional[int] = None`; the `Event` response schema exposes `campaign_id` so the frontend knows linkage
    - Campaign existence (422) and manager permission (403) checks live in the endpoint, not the schema
    - _Requirements: 7.1_

- [x] 3. Update CRUD layer and authorization helper
  - [x] 3.1 Rework CRUDCampaign.find_all_ordered
    - Edit `backend/bbe2/crud/crud_campaign.py`
    - Order by `created_at` descending (was start_date)
    - Add an `include_drafts: bool` parameter; when False, filter out campaigns with status "draft"
    - Compute the derived date range in SQL: `func.min(EventDB.date)` / `func.max(EventDB.date)` via LEFT OUTER JOIN on `EventDB.campaign_id` + GROUP BY campaign id (one query, no N+1)
    - `get_with_events` unchanged from v1
    - _Requirements: 2.1, 2.2, 2.3, 13.7_

  - [x] 3.2 Extract the non-raising user_is_campaign_manager helper
    - Add `user_is_campaign_manager(session, user_id) -> bool` in `backend/bbe2/utils/auth.py`, extracted from the existing `CampaignAuthorization` logic (True iff the user holds `campaign_manager` in any group membership)
    - `CampaignAuthorization` keeps its raising behavior for management endpoints; the helper is used by visibility filtering and event-creation checks
    - _Requirements: 14.3_

- [x] 4. Update campaign endpoints
  - [x] 4.1 Add draft filtering to campaign list and detail
    - Edit `backend/bbe2/api/v1/endpoints/campaigns.py`
    - `GET /campaigns`: resolve `include_drafts = user_is_campaign_manager(...)`, pass to `find_all_ordered`, map the aggregate row results into `CampaignListItem` with derived date fields
    - `GET /campaigns/{id}`: return 404 when the campaign has status "draft" and the requester is not a campaign manager (404 not 403, to avoid leaking draft existence); include derived first/last event dates in the response
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 14.1, 14.2_

  - [x] 4.2 Enforce draft-only creation and status-free updates
    - `POST /campaigns`: force `status="draft"` server-side (any client-sent status is discarded — CampaignCreate has no status field); keep the group existence check (422) and CampaignAuthorization (403)
    - `PATCH /campaigns/{id}`: name/description/group_id only; status cannot change through update (CampaignUpdate has no status field); remove any date validation logic
    - `DELETE /campaigns/{id}` unchanged from v1 (FK ON DELETE SET NULL unlinks events)
    - _Requirements: 1.1, 1.4, 1.5, 1.6, 1.7, 1.8, 4.1, 4.2, 4.3, 4.4_

  - [x] 4.3 Add publish and archive transition endpoints
    - `POST /campaigns/{campaign_id}/publish` (CampaignAuthorization): 404 if missing; 409 unless status == "draft"; set status to "active"; then for each linked event with `is_in_doodle`, add a `notify_new_event` background task (adapt the notifier call to work from EventDB rows — construct the schema from the ORM instance or adapt `notify_new_event`)
    - `POST /campaigns/{campaign_id}/archive` (CampaignAuthorization): 404 if missing; 409 unless status == "active"; set status to "archived"
    - 409 detail identifies the invalid transition (e.g. "Cannot publish a campaign with status '{status}'")
    - Status check and update in one transaction so concurrent publishes cannot double-fire notifications
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 9.4, 9.5_

- [x] 5. Update event endpoints
  - [x] 5.1 Add draft visibility filtering and the linkable filter to list_events
    - Edit `backend/bbe2/api/v1/endpoints/events.py`
    - When the requester is not a campaign manager (via `user_is_campaign_manager`), add an outer join to CampaignDB and filter: `campaign_id IS NULL OR campaigns.status != 'draft'` — an event is hidden iff it is linked to a draft campaign and the viewer is not a manager
    - Add a `linkable: Optional[bool] = None` query param; when true, filter `campaign_id IS NULL` (follows the existing `is_in_doodle` / `date__gte` param style)
    - The frontend calendar consumes this same endpoint, so calendar filtering comes for free
    - Existing date / is_in_doodle / ordering filters unchanged
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6, 8.7, 12.1_

  - [x] 5.2 Return 404 for draft-campaign events on get_event
    - In `get_event`: if the event is linked to a campaign with status "draft" and the requester is not a campaign manager, raise 404 "Event not found"
    - _Requirements: 8.1, 8.4_

  - [x] 5.3 Add campaign_id validation and deferred notification to create_event
    - When `event.campaign_id` is set: 403 if the requester is not a campaign manager; 422 "Campaign not found" if the campaign does not exist; otherwise create the event linked to the campaign
    - Deferred notification rule: skip `notify_new_event` at creation iff the event is linked to a campaign with status "draft"; otherwise preserve existing behavior (notify when `is_in_doodle`)
    - `create_response` eligibility gate is unchanged from v1
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3_

- [x] 6. Adapt the existing property test suite to v2
  - [x] 6.1 Remove the obsolete date-range validation property test
    - Delete `backend/tests/test_property_campaign_date_validation.py` (v1 Property 2 — campaign dates no longer exist)
    - _Requirements: 13.2_

  - [x] 6.2 Adapt the creation round-trip test (Property 1)
    - Update `backend/tests/test_property_campaign_creation_roundtrip.py`: payloads carry only name/description/group_id (no dates); assert generated id and created_at on retrieval
    - Update the tag to `# Feature: event-campaigns, Property 1: Campaign Creation Round-Trip`
    - **Property 1: Campaign Creation Round-Trip**
    - **Validates: Requirements 1.1, 1.3, 1.6, 2.4**

  - [x] 6.3 Adapt the authorization test (Property 3)
    - Update `backend/tests/test_property_campaign_authorization.py`: extend the operation set to include publish, archive, and event creation with a `campaign_id`; success iff the user holds `campaign_manager` in any group, else 403
    - **Property 3: Global Campaign Management Authorization**
    - **Validates: Requirements 1.8, 3.5, 4.4, 5.4, 6.8, 7.4, 14.3, 14.4, 14.5**

  - [x] 6.4 Adapt the list ordering test (Property 4)
    - Update `backend/tests/test_property_campaign_list_ordering.py`: generate campaigns with varying `created_at`; verify descending `created_at` order (was start_date)
    - **Property 4: Campaign List Ordering**
    - **Validates: Requirements 2.1, 10.3**

  - [x] 6.5 Adapt the update round-trip test (Property 7)
    - Update `backend/tests/test_property_campaign_update_roundtrip.py`: partial payloads over name/description/group_id; inject arbitrary `status` values into the raw payload and assert the campaign status is unchanged after the update; renumber the tag to Property 7
    - **Property 7: Campaign Update Round-Trip Preserves Status**
    - **Validates: Requirements 4.1, 4.2**

  - [x] 6.6 Adapt the kept link/deletion/eligibility tests (Properties 8, 9, 10, 16, 17)
    - Strip campaign dates from payload builders and renumber tags in: `test_property_campaign_deletion_preserves_events.py` (→ Property 8), `test_property_campaign_event_uniqueness.py` (→ Property 9), `test_property_campaign_link_unlink_roundtrip.py` (→ Property 10), `test_property_campaign_response_eligibility.py` (→ Property 16), `test_property_campaign_unlinked_open_access.py` (→ Property 17)
    - Behavior under test is unchanged; only fixtures/tags need updating
    - **Validates: Requirements 5.1, 5.3, 6.1, 6.2, 6.3, 6.6, 13.5, 14.7, 15.1, 15.2, 15.3**

- [x] 7. Write new property tests for v2 behavior
  - [x] 7.1 Write property test for draft-only creation (Property 2)
    - **Property 2: Created Status Is Always Draft**
    - Inject random status values into raw creation payloads; the created campaign always has status "draft"
    - Hypothesis, min 100 iterations, tag `# Feature: event-campaigns, Property 2: Created Status Is Always Draft`
    - **Validates: Requirements 1.4, 1.5**

  - [x] 7.2 Write property test for draft campaign visibility (Property 5)
    - **Property 5: Draft Campaign Visibility**
    - Mixed campaign statuses × manager/non-manager viewers; a campaign appears in the list and is retrievable by ID iff status != "draft" or viewer is a manager; non-manager detail on a draft → 404
    - **Validates: Requirements 2.2, 2.3, 2.5, 14.1, 14.2**

  - [x] 7.3 Write property test for one-way status transitions (Property 6)
    - **Property 6: One-Way Status Transitions**
    - Random (status, action) pairs against publish/archive; only draft→publish and active→archive succeed; all others return 409 and leave the status unchanged
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 7.4 Write property test for publish notification exactness (Property 13)
    - **Property 13: Publish Notification Exactness**
    - Draft campaigns with random mixes of doodle/non-doodle linked events, mocked `notify_new_event`; publishing invokes the notifier exactly once per `is_in_doodle` linked event and for no other event
    - **Validates: Requirements 9.4, 9.5**

  - [x] 7.5 Write property test for derived date range and event ordering (Property 14)
    - **Property 14: Derived Date Range and Event Ordering**
    - Campaigns with random linked event date sets (including empty); `first_event_date`/`last_event_date` equal min/max linked event dates or both null when empty; campaign detail lists events ordered by date ascending
    - **Validates: Requirements 13.7, 10.1, 10.2, 11.4**

  - [x] 7.6 Write property test for draft event visibility (Property 11)
    - **Property 11: Draft Event Visibility**
    - Events in all linkage states (unlinked, draft/active/archived campaign) × viewer roles; hidden from list and 404 on detail iff linked to a draft campaign and viewer is not a manager; includes publish-then-visible and unlink-then-visible sequences
    - **Validates: Requirements 6.7, 8.1, 8.2, 8.4, 8.5, 8.6, 8.7, 14.1, 14.2**

  - [x] 7.7 Write property test for the creation-time notification rule (Property 12)
    - **Property 12: Creation-Time Notification Rule**
    - Random `is_in_doodle` × linkage (none/draft/active), mocked `notify_new_event`; invoked at creation iff `is_in_doodle` is true and the event is not linked to a draft campaign
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [x] 7.8 Write property test for the linkable event filter (Property 15)
    - **Property 15: Linkable Event Filter**
    - Random linkage states; `GET /events/?linkable=true` returns exactly the events with `campaign_id IS NULL`
    - **Validates: Requirements 12.1**

- [x] 8. Checkpoint - Backend v2 complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Regenerate the frontend API client
  - [x] 9.1 Regenerate the bagad-client from the updated OpenAPI spec
    - With the backend running, run `yarn generate-client && yarn build:lib` from `frontend/`
    - Verify `publishCampaign`, `archiveCampaign`, the `linkable` query param, `campaign_id` on event schemas, and the derived date fields flow through to TypeScript
    - _Requirements: 3.1, 3.2, 7.1, 12.1, 13.7_

- [x] 10. Update the Campaign List page
  - [x] 10.1 Rework list.tsx for v2
    - Edit `frontend/app/src/pages/campaigns/list.tsx`
    - Add a "Nouvelle campagne" button visible only to campaign managers
    - Show a loading indicator while fetching instead of the empty-state message
    - Display the derived date range (`first_event_date`–`last_event_date`); show no date range when a campaign has no linked events
    - Ordering by creation date comes from the API; status badge and group filter unchanged from v1
    - _Requirements: 10.1, 10.2, 10.3, 10.7, 10.8_

- [x] 11. Update the Campaign Detail page
  - [x] 11.1 Rework detail display: loading, description, derived date range
    - Edit `frontend/app/src/pages/campaigns/detail.tsx`
    - Show a loading indicator while fetching instead of the empty state
    - Render the description exactly once on the page
    - Display the derived date range; none when the campaign has no linked events
    - _Requirements: 11.1, 11.2, 11.3, 11.11_

  - [x] 11.2 Add setup mode and event row interactions
    - Setup-mode call to action for managers when the campaign has no linked events (link existing events or create a new one); keep the plain "no events" message for non-managers
    - Event rows navigate to the event detail page on click
    - Per-row unlink action shown to managers (calls the existing unlink endpoint, refreshes the list)
    - _Requirements: 11.5, 11.6, 11.7, 11.9_

  - [x] 11.3 Add lifecycle actions and campaign-scoped event creation
    - Publish button shown to managers while status is "draft" (calls `publishCampaign`); archive button while status is "active" (calls `archiveCampaign`); refresh on success
    - "Créer un évènement" action for managers navigating to `/events/add?campaign={id}`
    - Management actions (edit, delete, publish, archive, link, create event) visible only to managers
    - _Requirements: 3.6, 3.7, 7.5, 11.8_

- [x] 12. Update the Campaign Form
  - [x] 12.1 Reduce CampaignForm to name/description/group
    - Edit `frontend/app/src/pages/campaigns/components/CampaignForm.tsx`: remove the start/end date fields, their Zod validation, and the status selector
    - Add a cancel button that returns to the previous page without saving
    - On successful create, navigate to the new campaign's detail page (setup mode)
    - Adjust `frontend/app/src/pages/campaigns/add.tsx` and `edit.tsx` for the reduced form and updated schemas
    - _Requirements: 1.2, 1.9, 4.5, 4.6_

- [x] 13. Update the Event Linker
  - [x] 13.1 Rework EventLinker for multi-link sessions
    - Edit `frontend/app/src/pages/campaigns/components/EventLinker.tsx`
    - Fetch events with `linkable=true` so only unlinked events are shown
    - Keep the dialog open after each successful link; remove the linked event from the displayed list
    - Keep the text filter on title/date; add an explicit close action to end the session
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 14. Update the Event Form
  - [x] 14.1 Add the optional campaign selector
    - Edit the event form (`frontend/app/src/pages/events/*`): show an optional campaign selector to campaign managers, sending `campaign_id` in the create payload
    - Pre-select the campaign from the `?campaign={id}` query param on `/events/add`
    - _Requirements: 7.2, 7.5, 7.6_

- [x] 15. Final checkpoint - Full v2 integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All v1 tasks were completed; this plan only covers the v2 migration (modifying existing code)
- Task 6 (adapting the existing test suite) is not optional: the v2 schema changes break the v1 tests, and checkpoints require a passing suite
- Property tests use Hypothesis with a minimum of 100 iterations, one test per property, tagged `# Feature: event-campaigns, Property N: <description>` (see design.md Correctness Properties and Testing Strategy for the v1→v2 remove/adapt/add breakdown)
- Draft resources are hidden with 404 (not 403) for non-managers to avoid leaking their existence
- The Alembic migration is destructive to v1 date data by design; the derived range replaces the stored guesses
- The frontend API client regeneration (task 9) requires the backend running locally (`yarn generate-client && yarn build:lib` from `frontend/`)
- The frontend calendar needs no dedicated change: it consumes `GET /events` which now filters draft-campaign events server-side (Req 8.3)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "3.2"] },
    { "id": 1, "tasks": ["1.2", "3.1"] },
    { "id": 2, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 3, "tasks": ["4.2", "5.2", "6.4"] },
    { "id": 4, "tasks": ["4.3", "5.3", "6.2", "6.5"] },
    { "id": 5, "tasks": ["6.3", "6.6", "7.1", "7.5"] },
    { "id": 6, "tasks": ["7.2", "7.3", "7.4", "7.6", "7.7", "7.8"] },
    { "id": 7, "tasks": ["9.1"] },
    { "id": 8, "tasks": ["10.1", "11.1", "12.1", "13.1", "14.1"] },
    { "id": 9, "tasks": ["11.2"] },
    { "id": 10, "tasks": ["11.3"] }
  ]
}
```
