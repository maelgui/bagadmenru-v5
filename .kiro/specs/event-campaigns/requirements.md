# Requirements Document

## Introduction

The Event Campaigns feature allows authenticated users of the Bagad Men Ru member platform to group related events together under a named campaign. Campaigns represent a logical grouping such as a concert outing ("Sortie 2025"), a rehearsal series ("Répé concours"), or a preparation period ("Sondage répé pour préparer la sortie du 15 juillet"). Each campaign belongs to a specific group. The group association on a campaign controls who can participate (submit attendance responses to events within that campaign), not who can view it. Campaign management operations (create, update, delete, publish, archive, link events) require the user to hold the `campaign_manager` role in any of their group memberships — this permission is not scoped to the campaign's owning group.

This revision (v2) redesigns the campaign lifecycle and creation flow based on usage of v1:

- Campaigns no longer carry their own date range. The displayed date range is derived from the linked events (earliest and latest event dates). The `start_date` and `end_date` columns are removed from the data model.
- Creation is simplified to name and owning group (description optional). Every new campaign starts in "draft" status; there is no status picker at creation. After creation the user lands on the campaign detail page, which acts as the setup area.
- The status lifecycle is strictly one-way: draft → active → archived. Publishing and archiving are explicit actions; reverting is rejected by the backend. The status field is removed from the generic edit form.
- Draft campaigns and their linked events are hidden from users who are not campaign managers, across the campaign list, campaign detail, event list, calendar, and event detail. Publishing a campaign reveals all its events at once.
- New-event notifications are deferred for events linked to a draft campaign: they are sent when the campaign is published rather than at event creation.
- Campaign managers can create events directly within a campaign (pre-linked), and the event linking dialog supports multi-link sessions showing only linkable events.

This feature leverages the existing group and role-based permission system. It does not modify authentication.

## Glossary

- **Campaign**: A named grouping of related events with an optional description, a lifecycle status, and an owning group. The owning group determines who can participate (respond to events).
- **Campaign_API**: The set of backend REST endpoints responsible for campaign CRUD operations, status transitions, event linking, and attendance response authorization.
- **Event_API**: The existing backend REST endpoints for event CRUD operations, extended in this feature to accept an optional campaign association and to filter event visibility.
- **Campaign_List_View**: The frontend page displaying campaigns with summary information.
- **Campaign_Detail_View**: The frontend page displaying a single campaign and its associated events. For campaign managers it acts as the setup area for the campaign.
- **Event_Linker**: The frontend dialog on the Campaign_Detail_View used by Campaign_Managers to link existing events to the campaign.
- **Campaign_Form**: The frontend form used to create or edit a campaign (name, description, owning group).
- **Event_Form**: The existing frontend form used to create or edit an event, extended with an optional campaign selector for Campaign_Managers.
- **Notification_Service**: The existing backend mechanism (`notify_new_event` background task) that notifies members when a new event requiring attendance responses is created.
- **Event**: An existing scheduled activity (rehearsal, concert, outing) tracked in the system.
- **Group**: An organizational unit (GroupDB) that users belong to. Each campaign is owned by exactly one group. Group ownership controls response eligibility, not visibility.
- **Role**: A named permission identifier (RoleDB) assigned to groups via the group_role_association_table.
- **Campaign_Manager**: A user who holds the `campaign_manager` role in any of their group memberships. Campaign_Managers can create, update, delete, publish, archive, and link events to any campaign regardless of which group owns it.
- **Authenticated_User**: Any user who has successfully authenticated with the platform.
- **Group_Member**: An authenticated user who belongs to the campaign's owning group. Group_Members can submit attendance responses to events linked to that campaign.
- **Status**: The lifecycle state of a campaign. One of: draft, active, archived. Transitions are one-way: draft → active → archived.
- **Draft_Campaign**: A campaign with status "draft". Draft_Campaigns and their linked events are visible only to Campaign_Managers.
- **Publishing**: The explicit action that transitions a campaign from "draft" to "active", revealing its events to all users and triggering deferred new-event notifications.
- **Archiving**: The explicit action that transitions a campaign from "active" to "archived".
- **Derived_Date_Range**: The date range displayed for a campaign, computed from its linked events as the earliest event date through the latest event date. A campaign with no linked events has no Derived_Date_Range.
- **Linkable_Event**: An event that is not currently linked to any campaign.
- **Response**: An attendance response (ResponseDB) submitted by a user for an event, indicating whether they will attend.

## Requirements

### Requirement 1: Campaign Creation

**User Story:** As a Campaign_Manager, I want to create a campaign by providing only a name and an owning group, so that I can start organizing events with minimal friction and complete the setup afterwards.

#### Acceptance Criteria

1. WHEN a Campaign_Manager submits a campaign creation request containing a name and an owning group, THE Campaign_API SHALL create a new Campaign with the provided name, optional description, and owning group, and return the created Campaign with its generated identifier.
2. IF a campaign creation request is missing the name or the owning group, THEN THE Campaign_API SHALL return a 422 validation error identifying the missing field.
3. THE Campaign_API SHALL store the Campaign name as a string of at most 150 characters.
4. THE Campaign_API SHALL set the status of every newly created Campaign to "draft".
5. IF a campaign creation request contains a status field, THEN THE Campaign_API SHALL ignore the provided status value and create the Campaign with status "draft".
6. THE Campaign_API SHALL associate the created Campaign with the specified owning group.
7. IF the owning group specified in a campaign creation request does not exist, THEN THE Campaign_API SHALL return a 422 validation error.
8. IF the requesting user does not hold the `campaign_manager` role in any of their group memberships, THEN THE Campaign_API SHALL return a 403 forbidden error.
9. WHEN a Campaign_Manager successfully creates a campaign through the Campaign_Form, THE frontend SHALL navigate directly to the Campaign_Detail_View of the newly created campaign.

### Requirement 2: Campaign Retrieval

**User Story:** As an Authenticated_User, I want to view the list of campaigns and see campaign details, so that I can understand how events are organized across the platform.

#### Acceptance Criteria

1. WHEN an Authenticated_User requests the campaign list, THE Campaign_API SHALL return the campaigns visible to that user ordered by creation date descending.
2. WHILE a campaign has status "draft", THE Campaign_API SHALL exclude that campaign from the campaign list returned to users who are not Campaign_Managers.
3. WHEN a Campaign_Manager requests the campaign list, THE Campaign_API SHALL include campaigns of all statuses (draft, active, archived).
4. WHEN an Authenticated_User requests a specific campaign by identifier, THE Campaign_API SHALL return the campaign details including its name, description, status, owning group, and the list of linked events.
5. IF a user who is not a Campaign_Manager requests a campaign with status "draft", THEN THE Campaign_API SHALL return a 404 error.
6. IF an Authenticated_User requests a campaign that does not exist, THEN THE Campaign_API SHALL return a 404 error.
7. IF an unauthenticated request is made to any campaign retrieval endpoint, THEN THE Campaign_API SHALL return a 401 unauthorized error.

### Requirement 3: Campaign Status Lifecycle

**User Story:** As a Campaign_Manager, I want to publish a draft campaign and archive an active campaign through explicit one-way actions, so that the campaign lifecycle is predictable and events are revealed at a controlled moment.

#### Acceptance Criteria

1. WHEN a Campaign_Manager publishes a campaign with status "draft", THE Campaign_API SHALL transition the campaign status to "active" and return the updated campaign.
2. WHEN a Campaign_Manager archives a campaign with status "active", THE Campaign_API SHALL transition the campaign status to "archived" and return the updated campaign.
3. IF a status transition request targets a transition other than draft → active or active → archived, THEN THE Campaign_API SHALL reject the request with a 409 conflict error identifying the invalid transition.
4. IF a status transition request targets a campaign that does not exist, THEN THE Campaign_API SHALL return a 404 error.
5. IF the requesting user does not hold the `campaign_manager` role in any of their group memberships, THEN THE Campaign_API SHALL return a 403 forbidden error.
6. THE Campaign_Detail_View SHALL display a publish action to Campaign_Managers WHILE the campaign has status "draft".
7. THE Campaign_Detail_View SHALL display an archive action to Campaign_Managers WHILE the campaign has status "active".

### Requirement 4: Campaign Update

**User Story:** As a Campaign_Manager, I want to update a campaign's name, description, or owning group, so that I can correct information over time without affecting the status lifecycle.

#### Acceptance Criteria

1. WHEN a Campaign_Manager submits a valid campaign update request containing name, description, or owning group changes, THE Campaign_API SHALL update the specified fields and return the updated Campaign.
2. IF a campaign update request contains a status field, THEN THE Campaign_API SHALL reject the status change or ignore the status value, so that status can only change through the dedicated transition actions defined in Requirement 3.
3. IF a Campaign_Manager submits an update request for a campaign that does not exist, THEN THE Campaign_API SHALL return a 404 error.
4. IF the requesting user does not hold the `campaign_manager` role in any of their group memberships, THEN THE Campaign_API SHALL return a 403 forbidden error.
5. THE Campaign_Form SHALL exclude the status field from the create and edit forms.
6. THE Campaign_Form SHALL provide a cancel action that returns the user to the previous page without saving changes.

### Requirement 5: Campaign Deletion

**User Story:** As a Campaign_Manager, I want to delete a campaign, so that I can remove campaigns that are no longer relevant.

#### Acceptance Criteria

1. WHEN a Campaign_Manager submits a campaign deletion request for an existing campaign, THE Campaign_API SHALL delete the campaign and return a confirmation.
2. IF a Campaign_Manager submits a deletion request for a campaign that does not exist, THEN THE Campaign_API SHALL return a 404 error.
3. WHEN a Campaign is deleted, THE Campaign_API SHALL unlink all associated events from the campaign without deleting the events themselves.
4. IF the requesting user does not hold the `campaign_manager` role in any of their group memberships, THEN THE Campaign_API SHALL return a 403 forbidden error.

### Requirement 6: Linking and Unlinking Events

**User Story:** As a Campaign_Manager, I want to link existing events to a campaign and unlink them, so that members can see which events belong together.

#### Acceptance Criteria

1. WHEN a Campaign_Manager links an event to a campaign, THE Campaign_API SHALL associate the event with the specified campaign.
2. THE Campaign_API SHALL enforce that each event belongs to at most one campaign at a time.
3. IF a Campaign_Manager attempts to link an event that is already linked to a different campaign, THEN THE Campaign_API SHALL return a 409 conflict error.
4. IF a Campaign_Manager attempts to link an event that does not exist, THEN THE Campaign_API SHALL return a 404 error referencing the missing event.
5. IF a Campaign_Manager attempts to link an event to a campaign that does not exist, THEN THE Campaign_API SHALL return a 404 error referencing the missing campaign.
6. WHEN a Campaign_Manager unlinks an event from a campaign, THE Campaign_API SHALL remove the association without deleting the event.
7. WHEN an event is unlinked from a Draft_Campaign, THE Event_API SHALL treat the event as a regular event visible to all Authenticated_Users, as defined in Requirement 8.
8. IF the requesting user does not hold the `campaign_manager` role in any of their group memberships, THEN THE Campaign_API SHALL return a 403 forbidden error.

### Requirement 7: Creating Events Within a Campaign

**User Story:** As a Campaign_Manager, I want to create a new event directly from the campaign detail page with the campaign pre-attached, so that I can build up a campaign without a separate linking step.

#### Acceptance Criteria

1. THE Event_API SHALL accept an optional campaign identifier in the event creation request.
2. WHEN an event creation request includes a campaign identifier, THE Event_API SHALL create the event linked to the specified campaign.
3. IF an event creation request includes a campaign identifier for a campaign that does not exist, THEN THE Event_API SHALL return a 422 validation error.
4. IF an event creation request includes a campaign identifier and the requesting user does not hold the `campaign_manager` role in any of their group memberships, THEN THE Event_API SHALL return a 403 forbidden error.
5. THE Campaign_Detail_View SHALL display a "Créer un évènement" action to Campaign_Managers that opens the Event_Form with the campaign pre-attached.
6. WHERE the requesting user is a Campaign_Manager, THE Event_Form SHALL display an optional campaign selector allowing the event to be linked to a campaign at creation.

### Requirement 8: Draft Campaign and Event Visibility

**User Story:** As a Campaign_Manager, I want draft campaigns and their events to be hidden from regular members until I publish the campaign, so that I can prepare a set of events without exposing incomplete information.

#### Acceptance Criteria

1. THE Event_API SHALL hide an event from a user if and only if the event is linked to a campaign with status "draft" and the user is not a Campaign_Manager.
2. WHILE an event is linked to a Draft_Campaign, THE Event_API SHALL exclude that event from the event list returned to users who are not Campaign_Managers.
3. WHILE an event is linked to a Draft_Campaign, THE frontend calendar SHALL exclude that event for users who are not Campaign_Managers.
4. IF a user who is not a Campaign_Manager requests the detail of an event linked to a Draft_Campaign, THEN THE Event_API SHALL return a 404 error.
5. WHILE an event is linked to a campaign with status "active" or "archived", THE Event_API SHALL include that event in event listings for all Authenticated_Users.
6. WHEN a campaign is published (draft → active), THE Event_API SHALL include all events linked to that campaign in event listings for all Authenticated_Users.
7. WHEN an event is unlinked from a Draft_Campaign, THE Event_API SHALL include that event in event listings for all Authenticated_Users.

### Requirement 9: Deferred New-Event Notifications

**User Story:** As a Group_Member, I want to be notified about campaign events only when the campaign is published, so that I receive one coherent announcement instead of notifications for events that are not yet visible to me.

#### Acceptance Criteria

1. WHEN an event requiring attendance responses is created without a campaign association, THE Notification_Service SHALL send the new-event notification at creation time (existing behavior preserved).
2. WHEN an event requiring attendance responses is created linked to a campaign with status "active", THE Notification_Service SHALL send the new-event notification at creation time.
3. WHEN an event requiring attendance responses is created linked to a Draft_Campaign, THE Notification_Service SHALL send no new-event notification at creation time.
4. WHEN a campaign is published (draft → active), THE Notification_Service SHALL send the new-event notification for each linked event that requires attendance responses.
5. WHEN a campaign is published and none of its linked events require attendance responses, THE Notification_Service SHALL send no new-event notifications.

### Requirement 10: Campaign List View (Frontend)

**User Story:** As an Authenticated_User, I want to see a list of campaigns in the application, so that I can browse and select one to view its events.

#### Acceptance Criteria

1. THE Campaign_List_View SHALL display the campaigns visible to the current user, showing each campaign's name, status, Derived_Date_Range, and owning group name.
2. WHEN a campaign has no linked events, THE Campaign_List_View SHALL display no date range for that campaign.
3. THE Campaign_List_View SHALL order campaigns by creation date descending.
4. WHEN an Authenticated_User selects a campaign from the list, THE Campaign_List_View SHALL navigate to the Campaign_Detail_View for that campaign.
5. THE Campaign_List_View SHALL visually distinguish campaigns by their status (draft, active, archived).
6. THE Campaign_List_View SHALL allow optional filtering of campaigns by owning group.
7. WHERE the current user is a Campaign_Manager, THE Campaign_List_View SHALL display a "Nouvelle campagne" action that opens the Campaign_Form.
8. WHILE campaign data is loading, THE Campaign_List_View SHALL display a loading indicator instead of the empty-state message.

### Requirement 11: Campaign Detail View (Frontend)

**User Story:** As an Authenticated_User, I want to view a campaign's details and its associated events, so that I can understand the full scope of a campaign; as a Campaign_Manager, I want the detail page to act as the setup area for the campaign.

#### Acceptance Criteria

1. THE Campaign_Detail_View SHALL display the campaign name, description, Derived_Date_Range, status, and owning group name.
2. WHEN the campaign has no linked events, THE Campaign_Detail_View SHALL display no date range.
3. THE Campaign_Detail_View SHALL display the campaign description at most once on the page.
4. THE Campaign_Detail_View SHALL display the list of events associated with the campaign, showing each event's title, date, and category, ordered by date ascending.
5. WHEN an Authenticated_User selects a linked event row, THE Campaign_Detail_View SHALL navigate to the detail page of that event.
6. WHERE the current user is a Campaign_Manager and the campaign has no linked events, THE Campaign_Detail_View SHALL display a call to action to add events (link existing events or create a new event).
7. WHEN the campaign has no associated events and the current user is not a Campaign_Manager, THE Campaign_Detail_View SHALL display a message indicating no events are linked.
8. THE Campaign_Detail_View SHALL display campaign management actions (edit, delete, publish, archive, link events, create event) only to Campaign_Managers.
9. WHERE the current user is a Campaign_Manager, THE Campaign_Detail_View SHALL display an unlink action on each linked event row.
10. THE Campaign_Detail_View SHALL indicate to the user whether they are eligible to respond to events within the campaign (based on group membership).
11. WHILE campaign data is loading, THE Campaign_Detail_View SHALL display a loading indicator instead of the empty-state message.

### Requirement 12: Event Linker Dialog (Frontend)

**User Story:** As a Campaign_Manager, I want the event linking dialog to support linking several events in a row and to show only events that can actually be linked, so that building a campaign is fast and free of avoidable errors.

#### Acceptance Criteria

1. THE Event_Linker SHALL display only Linkable_Events (events not linked to any campaign).
2. WHEN a Campaign_Manager links an event through the Event_Linker, THE Event_Linker SHALL remain open so that additional events can be linked in the same session.
3. WHEN an event is linked through the Event_Linker, THE Event_Linker SHALL remove that event from the displayed list of Linkable_Events.
4. THE Event_Linker SHALL allow filtering the displayed events by a text search on title and date.
5. THE Event_Linker SHALL provide an explicit close action to end the linking session.

### Requirement 13: Campaign Data Model and Migration

**User Story:** As a developer, I want a well-defined Campaign data model without campaign-level dates, so that the system persists campaigns reliably and the displayed date range always reflects the linked events.

#### Acceptance Criteria

1. THE Campaign model SHALL include the following fields: identifier (auto-generated integer primary key), name (string, max 150 characters, required), description (text, optional), status (string, default "draft"), group_id (foreign key to groups table, required), and created_at (timestamp, auto-generated).
2. THE Campaign model SHALL contain no start_date or end_date field.
3. THE database migration SHALL drop the existing start_date and end_date columns from the campaigns table.
4. THE Event model SHALL include an optional foreign key reference to the Campaign model, establishing a many-to-one relationship (many events to one campaign).
5. WHEN a Campaign is deleted, THE database SHALL set the campaign reference on all associated events to null rather than deleting the events.
6. THE Campaign model SHALL establish a many-to-one relationship with the Group model (many campaigns to one group) via the group_id foreign key.
7. THE Campaign_API SHALL derive the campaign date range from the linked events as the minimum and maximum event dates, or provide the linked events so that the frontend can derive it.

### Requirement 14: Campaign Authorization

**User Story:** As a developer, I want a clear permission model for campaign operations, so that visibility, management, and participation are properly restricted.

#### Acceptance Criteria

1. THE Campaign_API SHALL allow any Authenticated_User to view campaigns with status "active" or "archived" and their associated events without group membership restrictions.
2. THE Campaign_API SHALL restrict visibility of Draft_Campaigns and their linked events to Campaign_Managers, as defined in Requirements 2 and 8.
3. THE Campaign_API SHALL determine a user's campaign management permission by checking whether the user holds the `campaign_manager` role in any of their group memberships, regardless of which group owns the campaign.
4. THE Campaign_API SHALL restrict campaign creation, modification, deletion, status transitions, and event link/unlink operations to users who hold the `campaign_manager` role in any of their group memberships.
5. IF an authenticated user who does not hold the `campaign_manager` role in any of their group memberships attempts a campaign management operation, THEN THE Campaign_API SHALL return a 403 forbidden error with a message indicating insufficient permissions.
6. IF an unauthenticated request is made to any campaign endpoint, THEN THE Campaign_API SHALL return a 401 unauthorized error.
7. THE Campaign_API SHALL restrict attendance response submission to members of the campaign's owning group (group-scoped eligibility check), as defined in Requirement 15.

### Requirement 15: Event Response Eligibility

**User Story:** As a Group_Member, I want to submit attendance responses to events within my group's campaigns, so that I can indicate my participation in group activities.

#### Acceptance Criteria

1. WHEN a Group_Member submits an attendance response to an event linked to a campaign owned by their group, THE Campaign_API SHALL accept and store the response.
2. IF an Authenticated_User who is not a member of the campaign's owning group attempts to submit an attendance response to an event linked to that campaign, THEN THE Campaign_API SHALL return a 403 forbidden error indicating the user is not eligible to respond.
3. WHEN an event is not linked to any campaign, THE Campaign_API SHALL allow any Authenticated_User to submit an attendance response (existing behavior preserved).
4. THE Campaign_Detail_View SHALL display the response submission controls only to users who are members of the campaign's owning group.
5. THE Campaign_Detail_View SHALL display a message to non-group-members indicating they cannot respond to events in this campaign.
