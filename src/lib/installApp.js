// Installing the site as an app (Chrome, Edge and other Chromium browsers).
//
// The browser fires `beforeinstallprompt` once the site qualifies; keeping the
// event lets a button in the page show the install dialog. Safari has no such
// event (it uses File > Add to Dock), so there the button stays hidden and the
// FAQ/footer wording explains the menu instead.
import { useEffect, useState } from "react";

let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

/** True when running as an installed app rather than in a browser tab. */
export const isInstalledApp = () =>
  typeof window !== "undefined" &&
  ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true);

/** { canInstall, install } — install() shows the browser's install dialog. */
export function useInstallApp() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return {
    canInstall: !!deferred && !isInstalledApp(),
    install: async () => {
      if (!deferred) return;
      const event = deferred;
      deferred = null;
      notify();
      await event.prompt();
    },
  };
}

/** Registers the service worker (production only, where it is served over https or localhost). */
export function registerServiceWorker() {
  if (process.env.NODE_ENV !== "production" || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {
      // Not fatal: the site works the same without it, just not offline.
    });
  });
}
