// Series: a named group of lessons, such as "Child 1, Year 1".
//
// A lesson is a custom list (see customLists.js), so a series is just an
// ordered list of custom-list ids with a name. Series live in localStorage
// under `spellstars.series` and travel with backups and sync like lists do.
//
// A series can hold an id for a list that has since been deleted (or never
// arrived on this device). Nothing cleans those up eagerly: seriesLessons()
// simply leaves them out, and they drop away the next time the series is saved.

import { notifyLessonsChanged, recordDeletion } from "./deletions";
import { z } from "zod";
import { CUSTOM_ID_RE } from "./customLists";

export const SERIES_KEY = "spellstars.series";
export const SERIES_ID_RE = /^series-[a-z0-9]{4,12}$/;
export const MAX_SERIES = 20;
export const MAX_SERIES_LESSONS = 30;
export const MAX_SERIES_NAME = 60;

export const seriesSchema = z.object({
  id: z.string().regex(SERIES_ID_RE),
  name: z.string().min(1).max(MAX_SERIES_NAME),
  listIds: z.array(z.string().regex(CUSTOM_ID_RE)).max(MAX_SERIES_LESSONS),
  createdAt: z.string().max(40),
  updatedAt: z.string().max(40),
});

export function makeSeriesId(existingIds = [], random = Math.random) {
  const taken = new Set(existingIds);
  for (let i = 0; i < 100; i++) {
    let id = "series-";
    for (let j = 0; j < 6; j++) id += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(random() * 36)];
    if (!taken.has(id)) return id;
  }
  throw new Error("could not make a series id");
}

export function createSeries({ name, listIds = [], existingIds = [], now = new Date(), id }) {
  const stamp = now.toISOString();
  return {
    id: id || makeSeriesId(existingIds),
    name: (String(name || "").trim() || "My series").slice(0, MAX_SERIES_NAME),
    listIds: [...new Set(listIds)].slice(0, MAX_SERIES_LESSONS),
    createdAt: stamp,
    updatedAt: stamp,
  };
}

// ── Storage ────────────────────────────────────────────────────────────

const byNewest = (a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0);

/** All saved series, newest first. Damaged entries are skipped. Never throws. */
export function loadSeries(storage = window.localStorage) {
  let raw;
  try {
    raw = JSON.parse(storage.getItem(SERIES_KEY));
  } catch (err) {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const ok = seriesSchema.safeParse(item);
    if (!ok.success || seen.has(ok.data.id)) continue;
    seen.add(ok.data.id);
    out.push(ok.data);
    if (out.length >= MAX_SERIES) break;
  }
  return out.sort(byNewest);
}

export function saveSeries(storage, all) {
  try {
    storage.setItem(SERIES_KEY, JSON.stringify(all));
    notifyLessonsChanged();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Couldn't save the series. The device may be out of storage space." };
  }
}

export const getSeries = (storage, id) => loadSeries(storage).find((s) => s.id === id) || null;

/** Adds a series, or replaces the one with the same id. */
export function upsertSeries(storage, series) {
  const parsed = seriesSchema.safeParse(series);
  if (!parsed.success) return { ok: false, error: "That series isn't valid." };
  const all = loadSeries(storage);
  const index = all.findIndex((s) => s.id === series.id);
  if (index === -1 && all.length >= MAX_SERIES) {
    return { ok: false, error: "You can keep up to " + MAX_SERIES + " series. Delete one to make room." };
  }
  if (index === -1) all.push(parsed.data);
  else all[index] = parsed.data;
  return saveSeries(storage, all);
}

/** Deletes a series. Its lessons are kept. */
export function deleteSeries(storage, id) {
  recordDeletion(storage, id);
  return saveSeries(storage, loadSeries(storage).filter((s) => s.id !== id));
}

/** Puts a lesson at the end of a series (no change if it is already there). */
export function addListToSeries(storage, seriesId, listId, now = new Date()) {
  const series = getSeries(storage, seriesId);
  if (!series) return { ok: false, error: "That series isn't here any more." };
  if (series.listIds.includes(listId)) return { ok: true };
  if (series.listIds.length >= MAX_SERIES_LESSONS) {
    return { ok: false, error: "A series holds up to " + MAX_SERIES_LESSONS + " lessons." };
  }
  return upsertSeries(storage, { ...series, listIds: [...series.listIds, listId], updatedAt: now.toISOString() });
}

export function removeListFromSeries(storage, seriesId, listId, now = new Date()) {
  const series = getSeries(storage, seriesId);
  if (!series) return { ok: true };
  return upsertSeries(storage, { ...series, listIds: series.listIds.filter((id) => id !== listId), updatedAt: now.toISOString() });
}

// ── Pure helpers ───────────────────────────────────────────────────────

/** The series with one lesson moved up (-1) or down (+1). */
export function moveLesson(series, listId, delta) {
  const ids = series.listIds.slice();
  const from = ids.indexOf(listId);
  const to = from + delta;
  if (from === -1 || to < 0 || to >= ids.length) return series;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return { ...series, listIds: ids };
}

/** A series' lessons as list objects, in the series' order, leaving out missing ones. */
export function seriesLessons(series, lists) {
  const byId = new Map(lists.map((l) => [l.id, l]));
  return series.listIds.map((id) => byId.get(id)).filter(Boolean);
}

/** The series a lesson belongs to. */
export const seriesForList = (allSeries, listId) => allSeries.filter((s) => s.listIds.includes(listId));

/** Lessons that are in no series. The site shows them together as "Custom lessons". */
export function orphanLessons(allSeries, lists) {
  const filed = new Set(allSeries.flatMap((x) => x.listIds));
  return lists.filter((l) => !filed.has(l.id));
}

/** The name and address of the group of lessons that are in no series. */
export const CUSTOM_LESSONS_NAME = "Custom lessons";
export const CUSTOM_LESSONS_PATH = "/series/custom";
