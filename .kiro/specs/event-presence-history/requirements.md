# Requirements Document

## Introduction

The Event Presence History feature adds an audit trail and historical tracking to the attendance response system (doodle) of the Bagad Men Ru member platform. Currently, when a member changes their attendance response for an event, the previous value is overwritten. This feature preserves every response change as a timestamped history entry, enabling:

- **Statistics**: Understanding attendance patterns over time (per member, per event, per period)
- **Audit**: Knowing who changed their response, what the previous value was, and when
- **Sign-out detection**: Identifying members who committed to attending but later withdrew

The feature introduces a new `ResponseHistoryDB` model that records each response change without modifying the existing `ResponseDB` model's role as the current state. It also provides API endpoints for querying history and computing statistics, along with frontend views for authorized users.

## Glossary

- **Response**: The current attendance state of a member for an event, stored in `ResponseDB`. Values: `true` (attending), `false` (not attending), `null` (unknown/maybe).
- **Response_History_Entry**: A single immutable record capturing a change to a member's attendance response, including the previous value, new value, timestamp, and acting user.
- **History_API**: The set of backend REST endpoints responsible for querying response history and attendance statistics.
- **History_View**: The frontend component displaying the chronological list of response changes for an event or a member.
- **Statistics_API**: The subset of History_API endpoints that compute and return aggregated attendance metrics.
- **Statistics_View**: The frontend component displaying attendance statistics (charts, summaries).
- **Sign_Out**: A response change where the previous value is `true` (attending) and the new value is `false` or `null` (not attending or unknown).
- **Actor**: The authenticated user who performed the response change. In most cases this is the member themselves, but could be an admin acting on their behalf.
- **Admin**: A user with administrative privileges who can view all presence history and statistics.
- **Campaign_Manager**: A user who holds the campaign management permission for a group (as defined in the event-campaigns spec). Campaign_Managers can view presence history for events within their campaigns.
- **Authenticated_User**: Any user who has successfully authenticated with the platform.
- **Event**: A scheduled activity (rehearsal, concert, outing) tracked in the system.

## Requirements

### Requirement 1: Response History Recording

**User Story:** As a platform administrator, I want every attendance response change to be recorded as an immutable history entry, so that I can audit who changed what and when.

#### Acceptance Criteria

1. WHEN a member submits an attendance response for an event, THE History_API SHALL create a new Response_History_Entry containing the event identifier, user identifier, previous response value, new response value, timestamp, and actor identifier.
2. WHEN a member changes an existing attendance response, THE History_API SHALL create a new Response_History_Entry with the previous value set to the former response and the new value set to the updated response.
3. WHEN a member submits a response for the first time for an event, THE History_API SHALL create a Response_History_Entry with the previous value set to null.
4. THE History_API SHALL store Response_History_Entries as immutable records that cannot be modified or deleted through the API.
5. THE History_API SHALL record the actor identifier as the authenticated user who performed the change, even when an admin changes a response on behalf of another member.
6. WHEN the new response value is identical to the current response value, THE History_API SHALL not create a new Response_History_Entry.

### Requirement 2: Response History Data Model

**User Story:** As a developer, I want a well-defined history data model, so that the system can persist and query response changes reliably.

#### Acceptance Criteria

1. THE Response_History_Entry model SHALL include the following fields: identifier (auto-generated integer primary key), event_id (foreign key to events table, required), user_id (foreign key to users table, required), previous_value (nullable boolean), new_value (nullable boolean), changed_at (timestamp with timezone, auto-generated, required), and actor_id (foreign key to users table, required).
2. THE Response_History_Entry model SHALL establish a many-to-one relationship with the Event model via the event_id foreign key.
3. THE Response_History_Entry model SHALL establish a many-to-one relationship with the User model via the user_id foreign key (the member whose response changed).
4. THE Response_History_Entry model SHALL establish a many-to-one relationship with the User model via the actor_id foreign key (the user who performed the change).
5. WHEN an Event is deleted, THE database SHALL delete all associated Response_History_Entries via cascade.
6. THE Response_History_Entry model SHALL have an index on (event_id, user_id, changed_at) to support efficient history queries.

### Requirement 3: Response History Retrieval

**User Story:** As an admin or campaign manager, I want to view the history of attendance responses for an event, so that I can understand how participation evolved over time.

#### Acceptance Criteria

1. WHEN an authorized user requests the response history for a specific event, THE History_API SHALL return all Response_History_Entries for that event ordered by changed_at descending.
2. WHEN an authorized user requests the response history for a specific event filtered by a specific member, THE History_API SHALL return only the Response_History_Entries matching both the event and the member.
3. WHEN an authorized user requests the response history for a specific member across all events, THE History_API SHALL return all Response_History_Entries for that member ordered by changed_at descending.
4. THE History_API SHALL support pagination on all history retrieval endpoints using limit and offset parameters.
5. IF an unauthorized user requests response history, THEN THE History_API SHALL return a 403 forbidden error.
6. IF an unauthenticated request is made to any history endpoint, THEN THE History_API SHALL return a 401 unauthorized error.

### Requirement 4: Sign-Out Detection

**User Story:** As an admin or campaign manager, I want to easily identify members who signed out of an event (changed from attending to not attending), so that I can follow up or adjust planning.

#### Acceptance Criteria

1. WHEN an authorized user requests sign-outs for a specific event, THE History_API SHALL return all Response_History_Entries where the previous_value is true and the new_value is false or null.
2. THE History_API SHALL include the member's name, the timestamp of the sign-out, and the new value in the sign-out response.
3. WHEN an authorized user requests sign-outs filtered by a date range, THE History_API SHALL return only sign-outs where changed_at falls within the specified range.
4. THE History_API SHALL support an optional query parameter to include only the most recent sign-out per member for a given event.

### Requirement 5: Attendance Statistics

**User Story:** As an admin or campaign manager, I want to view attendance statistics, so that I can understand participation patterns and identify trends.

#### Acceptance Criteria

1. WHEN an authorized user requests statistics for a specific event, THE Statistics_API SHALL return the total number of unique respondents, the count of current positive responses, the count of current negative responses, the count of unknown/maybe responses, and the number of sign-outs.
2. WHEN an authorized user requests statistics for a specific member, THE Statistics_API SHALL return the total number of events the member responded to, the count of positive responses, the count of negative responses, the count of sign-outs, and the attendance rate as a percentage.
3. WHEN an authorized user requests statistics over a date range, THE Statistics_API SHALL compute statistics only for events whose date falls within the specified range.
4. THE Statistics_API SHALL support grouping statistics by event category (rehearsal, concert, etc.) when requested.
5. IF an unauthorized user requests statistics, THEN THE Statistics_API SHALL return a 403 forbidden error.

### Requirement 6: Presence History View (Frontend)

**User Story:** As an admin or campaign manager, I want a frontend view showing the attendance history for an event, so that I can visually track response changes over time.

#### Acceptance Criteria

1. THE History_View SHALL display a chronological list of response changes for a selected event, showing the member name, previous value, new value, timestamp, and actor name.
2. THE History_View SHALL visually distinguish sign-outs (previous value true, new value false or null) from other response changes using a distinct color or icon.
3. THE History_View SHALL provide a filter to show only sign-outs for the selected event.
4. THE History_View SHALL provide a filter to show history for a specific member within the event.
5. THE History_View SHALL be accessible from the event detail page for authorized users.
6. WHEN the user does not have permission to view history, THE History_View SHALL not display the history access controls.

### Requirement 7: Statistics View (Frontend)

**User Story:** As an admin or campaign manager, I want a frontend view showing attendance statistics, so that I can understand participation patterns at a glance.

#### Acceptance Criteria

1. THE Statistics_View SHALL display per-event statistics including the number of attendees, absentees, and sign-outs.
2. THE Statistics_View SHALL display per-member statistics including attendance rate and sign-out count over a configurable date range.
3. THE Statistics_View SHALL allow the user to filter statistics by event category.
4. THE Statistics_View SHALL allow the user to select a date range for computing statistics.
5. THE Statistics_View SHALL be accessible from the main navigation for authorized users.
6. WHEN the user does not have permission to view statistics, THE Statistics_View SHALL not appear in the navigation.

### Requirement 8: Authorization for History and Statistics

**User Story:** As a platform administrator, I want to control who can access presence history and statistics, so that sensitive attendance data is only visible to authorized users.

#### Acceptance Criteria

1. THE History_API SHALL grant access to all presence history and statistics endpoints to users with administrative privileges.
2. THE History_API SHALL grant access to presence history and statistics for events within a campaign to users who hold the Campaign_Manager permission for that campaign's owning group.
3. THE History_API SHALL allow any Authenticated_User to view their own response history (limited to their own user_id).
4. IF an Authenticated_User without admin or campaign manager privileges requests history or statistics for other members, THEN THE History_API SHALL return a 403 forbidden error.
5. THE History_API SHALL determine authorization by checking the requesting user's roles and group memberships against the event's campaign ownership.
6. WHEN an event is not linked to any campaign, THE History_API SHALL restrict history and statistics access to administrators only.
