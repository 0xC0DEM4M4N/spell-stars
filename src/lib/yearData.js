// Loader for the per-year word-list data described in
// spell-stars-wordlist-spec.md. years.config.json and each year's
// words.json live in /public/data (served as static assets), and are
// fetched — never bundled — so adding a new year is just dropping a new
// JSON file in, no rebuild required.
//
// Everything here is cached in memory for the life of the tab: switching
// between Practice and Word Search within the same year (or navigating
// away and back) never re-fetches.

import { useEffect, useState } from "react";

let configPromise = null;

/**
 * Fetches (once) and returns years.config.json — the small, eagerly-needed
 * config listing every year's slug/label/wordListPath/capabilities.
 */
export function getYearsConfig() {
  if (!configPromise) {
    configPromise = fetch("/data/years.config.json").then((res) => {
      if (!res.ok) {
        throw new Error("Failed to load years.config.json (" + res.status + ")");
      }
      return res.json();
    });
  }
  return configPromise;
}

/** Finds a year's config entry by slug. Returns undefined if not found. */
export function findYearBySlug(yearsConfig, slug) {
  return yearsConfig.years.find((year) => year.slug === slug);
}

const wordListPromises = new Map();

/**
 * Fetches (once per slug) a year's words.json, given its wordListPath from
 * years.config.json. Cached in memory for the session.
 */
export function getYearWords(slug, wordListPath) {
  if (!wordListPromises.has(slug)) {
    const promise = fetch(wordListPath).then((res) => {
      if (!res.ok) {
        throw new Error("Failed to load " + wordListPath + " (" + res.status + ")");
      }
      return res.json();
    });
    wordListPromises.set(slug, promise);
  }
  return wordListPromises.get(slug);
}

/**
 * React hook: resolves years.config.json (always) — components that only
 * need the year list (e.g. a year picker/nav) can stop here.
 *
 * Returns { status: "loading" | "ready" | "error", yearsConfig, error }.
 */
export function useYearsConfig() {
  const [state, setState] = useState({ status: "loading", yearsConfig: null, error: null });

  useEffect(() => {
    let cancelled = false;
    getYearsConfig()
      .then((yearsConfig) => {
        if (!cancelled) setState({ status: "ready", yearsConfig, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", yearsConfig: null, error });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * React hook: resolves a single year (config entry + word list) by slug.
 * This is what a year route (e.g. /:yearSlug) should use to drive Practice
 * and Word Search.
 *
 * Returns:
 *   { status: "loading" }
 *   { status: "not-found" }                          — slug isn't in years.config.json
 *   { status: "error", error }
 *   { status: "ready", yearMeta, words }              — yearMeta is the years.config.json entry
 *                                                        (includes capabilities), words is the
 *                                                        full array from that year's words.json
 */
export function useYearData(slug) {
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    setState({ status: "loading" });

    getYearsConfig()
      .then((yearsConfig) => {
        const yearMeta = findYearBySlug(yearsConfig, slug);
        if (!yearMeta) {
          if (!cancelled) setState({ status: "not-found" });
          return null;
        }
        return getYearWords(slug, yearMeta.wordListPath).then((words) => {
          if (!cancelled) setState({ status: "ready", yearMeta, words });
        });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", error });
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
