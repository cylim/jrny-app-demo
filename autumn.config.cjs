/**
 * Autumn Configuration: Subscription Tiers & Features
 *
 * Defines subscription tiers and feature gates for the JRNY application.
 * This config is loaded by the Convex Autumn client and used for:
 * - Product creation in Autumn/Stripe
 * - Feature access validation
 * - Subscription tier management
 */

module.exports = {
  tiers: {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      interval: null,
      features: [
        'profile_visits_hide',
        'profile_events_hide'
      ]
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 0.99,
      interval: 'month',
      currency: 'usd',
      features: [
        'profile_visits_hide',
        'profile_events_hide',
        'global_visit_privacy',
        'individual_visit_privacy'
      ]
    }
  },
  features: {
    profile_visits_hide: {
      id: 'profile_visits_hide',
      name: 'Hide Profile Visits',
      description: 'Hide visit history from profile page'
    },
    profile_events_hide: {
      id: 'profile_events_hide',
      name: 'Hide Profile Events',
      description: 'Hide event participation from profile page'
    },
    global_visit_privacy: {
      id: 'global_visit_privacy',
      name: 'Global Visit Privacy',
      description: 'Hide all visits from discovery features',
      tier: 'pro'
    },
    individual_visit_privacy: {
      id: 'individual_visit_privacy',
      name: 'Individual Visit Privacy',
      description: 'Hide specific visits from discovery',
      tier: 'pro'
    }
  }
};
