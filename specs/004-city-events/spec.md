# Feature Specification: City Events

**Feature Branch**: `004-city-events`
**Created**: 2025-11-15
**Status**: Draft
**Input**: User description: "Create new feature for Events in City. User can create event in a city and other users can join, it should show who joined the events. Create events page at `/e/$eventId`. city page should show all upcoming events in the city. user page should show all events user joined. Event owner can hide participant list for the events."

## Clarifications

### Session 2025-11-15

- Q: How should the system handle events after their date/time has passed? → A: Past events don't show on city pages but remain visible on user profiles in a "past events" tab.
- Q: What happens to events when the event owner deletes their account? → A: Delete all events owned by the user when their account is deleted.
- Q: Can non-logged-in users view event details and participant lists? → A: Allow anonymous users to view public event details and participant lists (when not hidden); require login only to join events.
- Q: How does the system handle event creation for cities with duplicate names in different countries? → A: Users are creating event in city page, the city should be preset and not changeable, city _id should be stored in event table for references.
- Q: When an organizer doesn't set a maximum capacity for their event, what should happen? → A: Events without capacity limit allow unlimited participants.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Discover City Events (Priority: P1)

A user arrives in a city and wants to organize a meetup at a local cafe. They create an event with details about the time, location, and what they'll be doing. Other users visiting the same city can browse upcoming events and decide which ones to join.

**Why this priority**: This is the core value proposition - enabling spontaneous social connections between travelers in the same city. Without event creation and discovery, the feature has no purpose.

**Independent Test**: Can be fully tested by creating an event, viewing it on the city page, and joining it. Delivers immediate value by connecting travelers in the same location.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing a city page, **When** they create a new event with title, description, date/time, and location, **Then** the event appears in the upcoming events list for that city
2. **Given** a logged-in user viewing a city's upcoming events, **When** they click on an event, **Then** they are taken to the event detail page showing all event information
3. **Given** a logged-in user on an event detail page, **When** they click "Join Event", **Then** they are added to the participant list and can see other participants
4. **Given** a logged-in user who has joined an event, **When** they visit their profile page, **Then** they can see all events they've joined

---

### User Story 2 - Event Visibility and Privacy Controls (Priority: P2)

An event organizer wants to host a small, intimate gathering and prefers not to publicly display the full participant list to maintain privacy. They can toggle participant list visibility when creating or editing the event.

**Why this priority**: Privacy controls are important for user trust and safety, but the basic event functionality must work first. This enhances the P1 experience but isn't required for initial value.

**Independent Test**: Can be tested by creating events with hidden participant lists and verifying non-participants cannot see the list. Still provides value even if implemented separately from P1.

**Acceptance Scenarios**:

1. **Given** a user creating an event, **When** they toggle "Hide participant list", **Then** only the event owner can see who has joined
2. **Given** an event with hidden participants, **When** a non-participant views the event page, **Then** they see the event details but not the participant list
3. **Given** an event with hidden participants, **When** a participant views the event page, **Then** they can see they've joined but not other participants
4. **Given** an event owner viewing their event with hidden participants, **When** they view the event page, **Then** they can see the full participant list

---

### User Story 3 - Event Management and Updates (Priority: P3)

An event organizer needs to update event details (change time, update description, or cancel the event). Participants should be able to leave events they've joined.

**Why this priority**: Nice-to-have functionality that improves user experience but isn't critical for initial launch. Users can create new events if changes are needed, or contact participants directly.

**Independent Test**: Can be tested by editing event details and verifying updates appear correctly. Adds convenience but doesn't block basic functionality.

**Acceptance Scenarios**:

1. **Given** an event owner viewing their event, **When** they edit event details (title, description, date/time, location), **Then** the changes are reflected on the event page
2. **Given** a user who has joined an event, **When** they click "Leave Event", **Then** they are removed from the participant list
3. **Given** an event owner, **When** they cancel an event, **Then** the event is marked as cancelled and no longer appears in upcoming event lists

---

### Edge Cases

- What happens when an event's date/time has passed? Past events are automatically filtered from city pages but remain visible on user profiles in a separate "past events" tab
- How does the system handle timezone differences for event times? Organizers can specify the timezone when creating events, allowing for flexible international event planning
- What happens when a user tries to join an event that's already full? Organizers can optionally set a maximum participant limit; when reached, users see "Event Full" and cannot join
- How does the system handle event creation for cities with duplicate names in different countries? Event creation occurs on the city page where the city is preset and immutable; the city's unique _id is stored in the event table
- What happens if an event owner deletes their account? All events owned by the user are automatically deleted when their account is deleted
- Can non-logged-in users view event details and participant lists? Yes, anonymous users can view public event details and participant lists (when not hidden by the organizer); login is required only to join events

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow logged-in users to create events from a city page where the city is automatically preset
- **FR-002**: System MUST store the city's unique identifier (_id) in the event table for referential integrity
- **FR-003**: System MUST prevent users from changing the city association after initiating event creation from a city page
- **FR-004**: System MUST require event title, description, date/time, and location for event creation
- **FR-005**: System MUST allow organizers to specify a timezone when creating events
- **FR-006**: System MUST allow organizers to optionally set a maximum participant capacity for events
- **FR-007**: System MUST allow unlimited participants to join events when no capacity limit is set
- **FR-008**: System MUST allow logged-in users to join events in cities
- **FR-009**: System MUST prevent users from joining events that have reached maximum capacity
- **FR-010**: System MUST display "Event Full" indicator when capacity is reached
- **FR-011**: System MUST display upcoming events on city pages, sorted by date (earliest first)
- **FR-012**: System MUST display all events a user has joined on their profile page, separated into "upcoming" and "past events" tabs
- **FR-013**: System MUST provide a dedicated event page at `/e/$eventId` showing event details
- **FR-014**: System MUST allow event owners to toggle participant list visibility (public/hidden)
- **FR-015**: System MUST show participant list to event owner regardless of visibility setting
- **FR-016**: System MUST hide participant list from non-participants when visibility is set to hidden
- **FR-017**: System MUST allow participants to view the participant list when visibility is public
- **FR-018**: System MUST allow event owners to edit event details (title, description, date/time, location, timezone, capacity)
- **FR-019**: System MUST allow users to leave events they have joined
- **FR-020**: System MUST prevent users from joining the same event multiple times
- **FR-021**: System MUST display event owner information on event pages
- **FR-022**: System MUST display event timezone on event pages
- **FR-023**: System MUST display remaining capacity on event pages (when capacity is set)
- **FR-024**: System MUST filter out past events from city page upcoming events list
- **FR-025**: System MUST allow non-logged-in users to view public event details and participant lists (when visibility is public) but not join events
- **FR-026**: System MUST retain past events in the database and make them accessible on user profiles
- **FR-027**: System MUST categorize events as "upcoming" (event date/time is in the future) or "past" (event date/time has passed)
- **FR-028**: System MUST delete all events owned by a user when that user's account is deleted
- **FR-029**: System MUST remove deleted events from all participant's event lists (both upcoming and past)
- **FR-030**: System MUST hide participant lists from anonymous users when the event owner has set visibility to hidden
- **FR-031**: System MUST display upcoming events on city pages to both logged-in and anonymous users

### Key Entities

- **Event**: Represents a gathering in a specific city with title, description, date/time, timezone, location, owner, associated city, participant visibility setting, and optional maximum capacity
- **Event Participant**: Represents a user's attendance at an event, linking users to events
- **Event-City Relationship**: Each event is associated with exactly one city from the cities table
- **Event-User Relationship**: Each event has one owner (creator) and zero or more participants (up to optional maximum capacity)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create an event in under 90 seconds from landing on a city page
- **SC-002**: Users can discover and join events in under 30 seconds from landing on a city page
- **SC-003**: Event pages load and display all relevant information in under 2 seconds
- **SC-004**: 80% of created events have at least one participant join within 48 hours
- **SC-005**: City pages accurately display only upcoming events (no past events shown)
- **SC-006**: Participant list visibility settings work correctly 100% of the time
- **SC-007**: Users can successfully view all their joined events from their profile page
- **SC-008**: System supports at least 100 concurrent users creating and joining events without performance degradation
