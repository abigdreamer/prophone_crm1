import posthog from 'posthog-js';

const KEY  = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let ready = false;

export function initAnalytics() {
  if (!KEY || ready) return;
  posthog.init(KEY, {
    api_host:                  HOST,
    capture_pageview:          false,  // no auto page views
    capture_pageleave:         false,  // no page leave noise
    autocapture:               false,  // no click/input tracking
    disable_session_recording: true,
    persistence:               'localStorage',
  });
  ready = true;
}

export function identifyUser(user) {
  if (!ready || !user?.id) return;
  posthog.identify(String(user.id), {
    email:   user.email,
    name:    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || user.email,
    role:    user.role,
  });
}

export function resetAnalytics() {
  if (!ready) return;
  posthog.reset();
}

function track(event, props = {}) {
  if (!ready) return;
  posthog.capture(event, props);
}

// ── Business events only ──────────────────────────────────────────────────────

export const analytics = {

  // Auth
  signedIn(user) {
    track('user_signed_in', {
      userId: user.id,
      role:   user.role,
    });
  },

  signedOut() {
    track('user_signed_out');
  },

  // Leads / Contacts
  leadCreated({ userId, clientId, stage } = {}) {
    track('lead_created', { userId, clientId, stage });
  },

  leadStageChanged({ userId, clientId, fromStage, toStage } = {}) {
    track('lead_stage_changed', { userId, clientId, fromStage, toStage });
  },

  leadConverted({ userId, clientId, contractValue } = {}) {
    track('lead_converted', { userId, clientId, contractValue });
  },

  // Campaigns
  campaignCreated({ userId, clientId } = {}) {
    track('campaign_created', { userId, clientId });
  },

  campaignLaunched({ userId, clientId, recipientCount } = {}) {
    track('campaign_launched', { userId, clientId, recipientCount });
  },

  // Domains
  domainVerified({ userId, domain } = {}) {
    track('domain_verified', { userId, domain });
  },
};
