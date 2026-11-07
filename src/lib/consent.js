// The visitor's answer to "may we count visits with Google Analytics?".
// Stored in localStorage under `spellstars.analytics` as "granted" or "denied".
// No answer means no analytics: public/index.html only loads Google Analytics
// when the answer is "granted". Cloudflare Web Analytics uses no cookies and
// isn't covered by this choice.
export const CONSENT_KEY = "spellstars.analytics";
export const CONSENT_OPEN_EVENT = "spellstars:consent-open";
export const GA_ID = "G-PNJLH4KESR";

export function readConsent(storage = window.localStorage) {
  try {
    const v = storage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch (err) {
    return null;
  }
}

function clearGoogleCookies() {
  try {
    const host = window.location.hostname;
    const parts = host.split(".");
    const domains = ["", host, "." + host];
    if (parts.length > 2) domains.push("." + parts.slice(-2).join("."));
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name === "_ga" || name.startsWith("_ga_") || name === "_gid") {
        domains.forEach((d) => {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + (d ? "; domain=" + d : "");
        });
      }
    });
  } catch (err) {
    /* ignore */
  }
}

export function saveConsent(value, storage = window.localStorage) {
  try {
    storage.setItem(CONSENT_KEY, value);
  } catch (err) {
    /* the choice just won't be remembered */
  }
  if (value === "granted") {
    if (window.spellStarsLoadAnalytics) window.spellStarsLoadAnalytics();
  } else {
    window["ga-disable-" + GA_ID] = true;
    clearGoogleCookies();
  }
}

/** Asks the banner to open again, so someone can change their mind. */
export function reopenConsent() {
  window.dispatchEvent(new Event(CONSENT_OPEN_EVENT));
}
