export const CONSENT_KEY = 'aao-resources:analytics-consent';
export const CONSENT_EVENT = 'aao-resources-consent-changed';
export const PREFERENCES_EVENT = 'aao-resources-open-privacy';
export const CONSENT_DURATION = 180 * 24 * 60 * 60 * 1000;
export const WIX_SCRIPT_URL = 'https://manage.wix.com/_api/headless-business-setup/v1/headless-business/site-script.js';

export function trackingConfigured(config) {
  return config.enabled === true && config.privacyReviewed === true && config.wixSettingsReviewed === true;
}

export function parseConsent(raw, config, now = Date.now()) {
  try {
    const value = JSON.parse(raw);
    if (value.version !== config.policyVersion || typeof value.analytics !== 'boolean'
      || !Number.isFinite(value.savedAt) || value.savedAt > now || now - value.savedAt >= CONSENT_DURATION) return null;
    return value;
  } catch { return null; }
}

export function consentRecord(analytics, config, now = Date.now()) {
  return JSON.stringify({ version: config.policyVersion, analytics: analytics === true, savedAt: now });
}

export function mayLoadTracking(config, consent, hostname, globalPrivacyControl = false) {
  return trackingConfigured(config) && consent?.analytics === true && hostname === config.hostname && !globalPrivacyControl;
}

export function loadWixSiteScript(environment, config, consent) {
  if (!mayLoadTracking(config, consent, environment.location.hostname, environment.navigator.globalPrivacyControl)
    || environment.document.getElementById('wix-site-script')) return false;
  if (!/^[a-f0-9-]{36}$/i.test(config.clientId)) throw new Error('Invalid Wix Headless client ID');
  const script = environment.document.createElement('script');
  script.id = 'wix-site-script';
  script.src = WIX_SCRIPT_URL;
  script.async = true;
  script.setAttribute('data-client-id', config.clientId);
  environment.document.head.appendChild(script);
  return true;
}