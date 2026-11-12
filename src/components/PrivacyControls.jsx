import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { X } from 'lucide-react';
import config from '../data/privacy-config.js';
import { CONSENT_KEY, CONSENT_EVENT, PREFERENCES_EVENT, consentRecord, parseConsent, trackingConfigured, mayLoadTracking, loadWixSiteScript } from '../utils/privacy.mjs';

function readPreference() {
  try { return localStorage.getItem(CONSENT_KEY) || ''; } catch { return ''; }
}

function removeStoredValue(key) {
  try { localStorage.removeItem(key); return true; } catch { return false; }
}

function stopTracking() {
  if (!document.getElementById('wix-site-script')) return;
  function finish() {
    removeStoredValue(`wixSiteScript:${config.clientId}`);
    window.location.reload();
  }
  if (window.consentPolicyManager) window.consentPolicyManager.setConsentPolicy({ analytics: false, advertising: false, dataToThirdParty: false, functional: false }, finish, finish);
  else finish();
}

function subscribe(callback) {
  function storageChanged(event) {
    callback();
    if ((event.key === CONSENT_KEY || event.key === null) && parseConsent(readPreference(), config)?.analytics !== true) stopTracking();
  }
  window.addEventListener('storage', storageChanged);
  window.addEventListener(CONSENT_EVENT, callback);
  return () => {
    window.removeEventListener('storage', storageChanged);
    window.removeEventListener(CONSENT_EVENT, callback);
  };
}

export default function PrivacyControls() {
  const raw = useSyncExternalStore(subscribe, readPreference, () => '');
  const choice = parseConsent(raw, config);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState('');
  const returnFocus = useRef(null);
  const closeButton = useRef(null);
  const configured = trackingConfigured(config);
  const optOutSignal = typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true;
  const showNotice = settingsOpen || (configured && !choice);

  useEffect(() => {
    function open() { returnFocus.current = document.activeElement; setSettingsOpen(true); }
    window.addEventListener(PREFERENCES_EVENT, open);
    return () => window.removeEventListener(PREFERENCES_EVENT, open);
  }, []);

  useEffect(() => {
    if (showNotice && settingsOpen) closeButton.current?.focus();
  }, [showNotice, settingsOpen]);

  useEffect(() => {
    if (!mayLoadTracking(config, parseConsent(raw, config), window.location.hostname, navigator.globalPrivacyControl)) return;
    function applyWixPolicy() {
      const manager = window.consentPolicyManager;
      if (!manager) return;
      const policy = manager.getCurrentConsentPolicy()?.policy;
      if (policy?.analytics === true && policy.advertising === false && policy.dataToThirdParty === false && policy.functional === false) return;
      manager.setConsentPolicy({ analytics: true, advertising: false, dataToThirdParty: false, functional: false }, () => window.location.reload(), () => {
        removeStoredValue(CONSENT_KEY);
        window.location.reload();
      });
    }
    window.addEventListener('consentPolicyManagerReady', applyWixPolicy);
    loadWixSiteScript(window, config, parseConsent(raw, config));
    if (window.consentPolicyManager) applyWixPolicy();
    return () => window.removeEventListener('consentPolicyManagerReady', applyWixPolicy);
  }, [raw]);

  function save(analytics) {
    try {
      localStorage.setItem(CONSENT_KEY, consentRecord(analytics, config));
      window.dispatchEvent(new Event(CONSENT_EVENT));
      setError(''); setSettingsOpen(false); returnFocus.current?.focus();
    } catch {
      if (!analytics) {
        removeStoredValue(CONSENT_KEY);
        window.dispatchEvent(new Event(CONSENT_EVENT)); stopTracking();
      }
      setError('Your preference could not be saved. Analytics remains off.'); return;
    }
    if (!analytics) stopTracking();
  }

  function close() {
    if (!choice) save(false);
    else { setSettingsOpen(false); returnFocus.current?.focus(); }
  }

  if (!showNotice) return null;
  return <aside className="privacy-notice" role="dialog" aria-modal="false" aria-labelledby="privacy-notice-heading" onKeyDown={event => { if (event.key === 'Escape') close(); }}>
    <div className="privacy-notice-inner"><div className="privacy-notice-copy"><h2 id="privacy-notice-heading">Your Privacy Choices</h2><p>{configured ? 'With your permission, optional analytics helps All Aboard Ohio understand how this resource library is used. It may use cookies or similar technologies to recognize visits. Analytics stays off unless you choose Allow analytics.' : 'Optional analytics is currently switched off on this resource library. You can use all our resources without accepting optional tracking.'}</p>{optOutSignal && <p>Your browser has requested privacy protection. Analytics will stay off.</p>}<a href="/privacy/">Privacy &amp; cookies</a>{error && <p role="alert">{error}</p>}</div><div className="privacy-notice-actions"><button className="privacy-choice" onClick={() => save(false)}>Keep analytics off</button><button className="privacy-choice" onClick={() => save(true)} disabled={!configured || optOutSignal}>Allow analytics</button></div><button ref={closeButton} className="privacy-close" type="button" title="Close privacy choices" aria-label="Close privacy choices without granting consent" onClick={close}><X size={20} aria-hidden="true" /></button></div>
  </aside>;
}