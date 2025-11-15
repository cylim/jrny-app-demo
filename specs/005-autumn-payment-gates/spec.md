# Feature Specification: Autumn Payment Gates

**Feature Branch**: `005-autumn-payment-gates`
**Created**: 2025-11-15
**Status**: Draft
**Input**: User description: "Add Autumn with payment gates to protect certain features. Hide profile visits (free and pro), hide profile events (free and pro), global visit hide (pro only), single visit hide (pro only). Pro tier costs $0.99 USD."

## Clarifications

### Session 2025-11-15

- Q: Pro tier permanence - is it one-time purchase or subscription? → A: Monthly subscription at $0.99 USD/month
- Q: Subscription grace period after payment failure? → A: Immediate downgrade upon first payment failure
- Q: Mid-month cancellation access retention? → A: Retain Pro access until end of current billing period
- Q: Re-subscription privacy settings restoration? → A: Automatically restore previous privacy settings (including private visit flags)
- Q: Global visit privacy interaction with profile-level hide? → A: They work independently (both can be enabled separately for maximum flexibility)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Free User Privacy Controls (Priority: P1)

A free-tier user wants to control who can see their travel activity on their profile. They can hide their visit history and event participation from other users while still maintaining their own access to this information.

**Why this priority**: Core privacy functionality that delivers immediate value to all users, regardless of payment tier. This establishes the foundation for privacy controls and demonstrates value before asking for payment.

**Independent Test**: Can be fully tested by creating a free account, toggling visibility settings in profile preferences, and verifying that visit history and event lists are hidden from other users while still visible to the account owner.

**Acceptance Scenarios**:

1. **Given** a logged-in free-tier user viewing their settings, **When** they toggle "Hide profile visits" to enabled, **Then** other users visiting their profile cannot see their visit history
2. **Given** a logged-in free-tier user viewing their settings, **When** they toggle "Hide profile events" to enabled, **Then** other users visiting their profile cannot see their event participation
3. **Given** a free-tier user with hidden visits, **When** they view their own profile, **Then** they can still see all their visits and events
4. **Given** another user viewing a profile with hidden content, **When** visits or events are hidden, **Then** they see a message indicating the content is private

---

### User Story 2 - Pro Tier Upgrade and Payment (Priority: P2)

A user wants to unlock advanced privacy features by upgrading to the Pro tier for $0.99 USD. They can complete the payment process, receive confirmation, and immediately gain access to Pro-only features.

**Why this priority**: Enables monetization and unlocks the advanced privacy features. Required before Pro-only features can be used, but the free tier must work first to demonstrate value.

**Independent Test**: Can be fully tested by initiating an upgrade from the settings page, completing payment with test credentials, and verifying that the user's tier is updated and Pro features become accessible.

**Acceptance Scenarios**:

1. **Given** a logged-in free-tier user, **When** they click "Upgrade to Pro" in settings, **Then** they see payment details including the $0.99 USD price
2. **Given** a user on the payment screen, **When** they complete payment successfully, **Then** their account is upgraded to Pro tier immediately
3. **Given** a user with failed payment, **When** payment processing fails, **Then** they see an error message and remain on free tier
4. **Given** a Pro-tier user, **When** they view their settings, **Then** they see "Pro" badge and have access to Pro-only toggles
5. **Given** a user who just upgraded, **When** payment succeeds, **Then** they receive confirmation via email and in-app notification

---

### User Story 3 - Pro User Global Privacy Control (Priority: P3)

A Pro-tier user wants comprehensive privacy by hiding all their visits from discovery features across the entire platform (city pages, overlap detection, visitor lists) while still being able to track their own travel history. This global privacy setting works independently from the profile-level "hide visits" toggle - users can enable one or both depending on their needs.

**Why this priority**: Premium feature that provides maximum privacy. Depends on payment system (P2) being implemented first and builds on basic privacy controls (P1).

**Independent Test**: Can be fully tested by upgrading to Pro, enabling "Global visit privacy", and verifying that the user's visits do not appear in any public city visitor lists, overlap detections, or discovery features while remaining visible in their own profile.

**Acceptance Scenarios**:

1. **Given** a Pro-tier user in settings, **When** they toggle "Global visit privacy" to enabled, **Then** their visits are excluded from all city visitor lists
2. **Given** a Pro user with global privacy enabled, **When** another user views a city the Pro user visited, **Then** the Pro user does not appear in "Current visitors" or "Past visitors" lists
3. **Given** a Pro user with global privacy enabled, **When** another user checks for travel overlaps, **Then** the Pro user's visits are not included in overlap detection
4. **Given** a Pro user with global privacy enabled, **When** they view their own profile, **Then** they can still see all their visits and analytics
5. **Given** a free-tier user, **When** they try to enable "Global visit privacy", **Then** they see a prompt to upgrade to Pro

---

### User Story 4 - Pro User Individual Visit Privacy (Priority: P3)

A Pro-tier user wants granular control over specific visits, hiding individual trips (e.g., sensitive locations, business travel) while keeping other visits public.

**Why this priority**: Advanced feature for power users who need selective privacy. Builds on both basic controls (P1) and Pro tier access (P2). Less critical than global privacy but provides additional value for Pro subscribers.

**Independent Test**: Can be fully tested by creating multiple visits as a Pro user, marking specific ones as private, and verifying that private visits don't appear in public lists while non-private visits remain visible.

**Acceptance Scenarios**:

1. **Given** a Pro-tier user editing a visit, **When** they toggle "Make this visit private" to enabled, **Then** that specific visit is hidden from public city pages
2. **Given** a Pro user with mixed private/public visits to a city, **When** another user views that city page, **Then** only the public visits are shown in visitor lists
3. **Given** a Pro user viewing their own visit list, **When** they have both private and public visits, **Then** they see all visits with clear indicators of which are private
4. **Given** a free-tier user creating a visit, **When** they try to mark it private, **Then** they see a message prompting upgrade to Pro
5. **Given** a Pro user with private visits, **When** they downgrade to free tier, **Then** those visits remain hidden from public view and the privacy flags are preserved until the user re-upgrades to Pro

---

### Edge Cases

- What happens when a Pro user cancels subscription? Private visits remain hidden and privacy flags are preserved (answered: Option B - preserve as hidden)
- How does the system handle users who had private visits and cancel subscription? They cannot toggle individual visit privacy without re-subscribing to Pro
- What happens if a user upgrades to Pro while on a city page - do their visits immediately appear/disappear based on new privacy settings?
- What happens when a user attempts payment in an unsupported currency or region?
- How does the system handle concurrent privacy toggle changes (e.g., both global and individual toggles being modified at once)?
- Can a cancelled subscription user still view their own private visits in their profile?
- What messaging does a cancelled subscription user see when viewing visits marked as private?
- What happens when a subscription payment fails (expired card, insufficient funds)? User is immediately downgraded to Free tier (answered: no grace period)
- What happens if user cancels subscription mid-month - do they retain Pro access until end of billing period? Yes, retain access until billing period ends (answered)
- How does the system handle users who cancel and then re-subscribe - do old privacy settings restore? Yes, automatically restore all previous privacy settings (answered)
- Does the system show cancellation status/countdown to users who cancelled but still have access until billing period ends?
- How long are privacy settings preserved after cancellation - forever or with expiration?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide two user tiers: Free and Pro ($0.99 USD/month subscription)
- **FR-002**: Free tier users MUST be able to hide profile visits from other users' view
- **FR-003**: Free tier users MUST be able to hide profile events from other users' view
- **FR-004**: Pro tier users MUST be able to enable global visit privacy to hide all visits from discovery features
- **FR-005**: Pro tier users MUST be able to mark individual visits as private
- **FR-006**: System MUST process recurring monthly payments of $0.99 USD for Pro tier subscriptions
- **FR-007**: System MUST verify payment completion before granting Pro tier access
- **FR-008**: System MUST configure Autumn payment gates in `autumn.config.ts`
- **FR-009**: System MUST enforce tier restrictions (prevent free users from accessing Pro-only features)
- **FR-010**: System MUST maintain user privacy settings persistently in the database
- **FR-011**: Profile privacy toggles (hide visits, hide events) MUST work identically for both Free and Pro tiers
- **FR-012**: Global visit privacy and individual visit privacy MUST only be accessible to Pro tier users
- **FR-033**: Profile-level "hide visits" toggle and global visit privacy MUST work independently (both can be enabled/disabled separately)
- **FR-034**: When both profile-level hide and global visit privacy are enabled, visits are hidden from both profile page AND all discovery features
- **FR-013**: Users MUST be able to view their own content regardless of privacy settings
- **FR-014**: System MUST display appropriate upgrade prompts when free users attempt to access Pro features
- **FR-015**: System MUST update user tier status immediately upon successful payment
- **FR-016**: System MUST handle payment failures gracefully without granting access
- **FR-017**: Hidden visits MUST be excluded from city visitor lists, overlap detection, and all discovery features
- **FR-018**: Hidden events MUST be excluded from profile event lists when viewed by other users
- **FR-019**: System MUST provide clear visual indicators (badges, labels) distinguishing Pro from Free users
- **FR-020**: System MUST validate Autumn configuration on application startup
- **FR-021**: When a Pro user downgrades to free tier, system MUST preserve existing individual visit privacy flags
- **FR-022**: Downgraded free-tier users MUST NOT be able to toggle individual visit privacy flags without re-upgrading
- **FR-023**: Free-tier users who downgraded MUST still be able to view their own private visits in their profile
- **FR-024**: System MUST continue hiding visits marked as private even after user downgrades to free tier
- **FR-025**: System MUST automatically renew Pro subscriptions monthly until user cancels
- **FR-026**: Users MUST be able to cancel their Pro subscription at any time
- **FR-027**: When users cancel subscription mid-month, system MUST retain Pro tier access until end of current billing period
- **FR-028**: System MUST immediately downgrade users to Free tier when subscription payment fails (expired cards, insufficient funds)
- **FR-029**: System MUST notify users via email when payment failure occurs and subscription is cancelled
- **FR-030**: System MUST track subscription renewal dates, cancellation dates, and payment history
- **FR-031**: When users re-subscribe to Pro after cancellation, system MUST automatically restore all previous privacy settings including individual visit privacy flags
- **FR-032**: System MUST preserve privacy settings indefinitely even after subscription cancellation to enable restoration upon re-subscription

### Key Entities

- **User Tier**: Represents subscription level (Free or Pro), includes subscription status (active/cancelled/pending_cancellation), next billing date, cancellation date, billing period end date
- **Privacy Settings**: User-specific configuration including profile-level toggles (hideVisits, hideEvents) and Pro-only toggles (globalVisitPrivacy)
- **Visit Privacy Flag**: Individual visit metadata indicating whether a specific visit is private (Pro-only feature)
- **Payment Transaction**: Record of Pro tier purchase including amount ($0.99), status (pending/completed/failed), timestamp
- **Autumn Config**: Application-level configuration defining feature gates, tier requirements, and pricing in `autumn.config.ts`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Free tier users can successfully hide profile visits and events within 30 seconds of accessing settings
- **SC-002**: Pro tier payment process completes in under 2 minutes from upgrade click to tier activation
- **SC-003**: 100% of privacy settings take effect immediately (no page refresh required)
- **SC-004**: Pro tier users can toggle global visit privacy and verify changes reflected across all city pages within 5 seconds
- **SC-005**: Zero unauthorized access to Pro features by free-tier users (100% enforcement of tier restrictions)
- **SC-006**: Payment success rate exceeds 95% for valid payment methods
- **SC-007**: Users can independently test and verify their privacy settings work correctly by viewing their profile from a different account
- **SC-008**: 90% of users understand the difference between Free and Pro tier features without contacting support
- **SC-009**: Hidden content remains completely invisible to other users in all discovery contexts (city pages, search, overlaps)
- **SC-010**: User can complete Pro upgrade without leaving the application (no external redirects)

## Assumptions

- Users have a valid payment method supported by Autumn's payment processing system
- The application already has user authentication and profile management in place
- Autumn SDK/library supports recurring monthly subscription payments and feature gating
- Privacy settings apply immediately without requiring background processing or scheduled jobs
- The $0.99 USD/month price point is final and does not require multi-currency support initially
- Pro tier is a monthly recurring subscription that auto-renews until cancelled
- Email notification system is available for payment confirmations and renewal notifications
- Default state for new users is Free tier with all privacy toggles disabled (content visible)
- Existing visits created before privacy features launch default to public visibility

## Dependencies

- Autumn payment SDK/library integration
- Payment processing provider configured and operational
- User settings storage schema supports new privacy fields
- Visit and event data models support privacy flags
- Authentication system can verify user tier status
- City page queries and overlap detection logic can filter by privacy settings

## Out of Scope

- Multi-tier pricing (more than Free and Pro)
- Family or team plans
- Refund processing workflows beyond standard subscription cancellation
- Payment method management (add/remove cards)
- Analytics on who viewed hidden content
- Temporary privacy modes or scheduled privacy changes
- Export/import of privacy settings
- Admin override of user privacy settings
- Multi-currency pricing or regional pricing variations
- Prorated refunds for mid-month cancellations
- Annual or multi-month subscription discounts
