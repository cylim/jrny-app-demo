/**
 * Autumn Configuration: Subscription Tiers & Features
 *
 * Use `atmn sync` to sync this config to Autumn dashboard.
 *
 * Defines subscription tiers and feature gates for the JRNY application.
 * This config is loaded by the Convex Autumn client and used for:
 * - Product creation in Autumn/Stripe
 * - Feature access validation
 * - Subscription tier management
 */

import { feature, featureItem, priceItem, product } from 'atmn'

// Features
const profileVisitsHide = feature({
  id: 'profile_visits_hide',
  name: 'Hide Profile Visits',
  // description: "Hide visit history from profile page",
  type: 'boolean',
})

const profileEventsHide = feature({
  id: 'profile_events_hide',
  name: 'Hide Profile Events',
  // description: "Hide event participation from profile page",
  type: 'boolean',
})

const globalVisitPrivacy = feature({
  id: 'global_visit_privacy',
  name: 'Global Visit Privacy',
  // description: "Hide all visits from discovery features",
  type: 'boolean',
})

const individualVisitPrivacy = feature({
  id: 'individual_visit_privacy',
  name: 'Individual Visit Privacy',
  // description: "Hide specific visits from discovery",
  type: 'boolean',
})

const eventParticipantListHide = feature({
  id: 'event_participant_list_hide',
  name: 'Hide Event Participant List',
  // description: "Hide participant list from non-participants in your events",
  type: 'boolean',
})

// Products
const freeTier = product({
  id: 'free',
  name: 'Free',
  is_default: true,
  items: [
    featureItem({
      feature_id: profileVisitsHide.id,
      included_usage: 1,
      interval: 'month',
    }),
    featureItem({
      feature_id: profileEventsHide.id,
      included_usage: 1,
      interval: 'month',
    }),
  ],
})

const proTier = product({
  id: 'pro',
  name: 'Pro',
  items: [
    priceItem({
      price: 0.99, // $0.99 per month (in cents)
      interval: 'month',
    }),
    featureItem({
      feature_id: profileVisitsHide.id,
      included_usage: 1,
      interval: 'month',
    }),
    featureItem({
      feature_id: profileEventsHide.id,
      included_usage: 1,
      interval: 'month',
    }),
    featureItem({
      feature_id: globalVisitPrivacy.id,
      included_usage: 1,
      interval: 'month',
    }),
    featureItem({
      feature_id: individualVisitPrivacy.id,
      included_usage: 1,
      interval: 'month',
    }),
    featureItem({
      feature_id: eventParticipantListHide.id,
      included_usage: 1,
      interval: 'month',
    }),
  ],
})

export default {
  products: { freeTier, proTier },
  features: [
    profileVisitsHide,
    profileEventsHide,
    globalVisitPrivacy,
    individualVisitPrivacy,
    eventParticipantListHide,
  ],
}
