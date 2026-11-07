// Syncing lessons and series to a signed-in account.
//
// Only lessons and series go to the cloud for now (not practice progress).
// The cloud holds one row per account: { lists, series, deleted }.
//
// A sync pulls the cloud copy, merges it into this device with the same merge
// the backup page uses (newer `updatedAt` wins, nothing is lost), then pushes
// the result back. Deleting is remembered separately (see deletions.js) so a
// deleted lesson doesn't come back from another device.
import { readLocalSnapshot, snapshotSchema, SNAPSHOT_APP, SNAPSHOT_VERSION } from "./syncSnapshot";
import { applyMergeResult, isNoOp, mergeSnapshots } from "./syncMerge";
import { CUSTOM_LISTS_KEY } from "./customLists";
import { SERIES_KEY } from "./series";
import { loadDeleted, pruneDeleted, saveDeleted, unionDeleted } from "./deletions";

const TABLE = "user_data";

/** A snapshot that carries only lessons and series. */
export function lessonsOnlySnapshot(data, now = new Date()) {
  const parsed = snapshotSchema.safeParse({
    app: SNAPSHOT_APP,
    v: SNAPSHOT_VERSION,
    exportedAt: now.toISOString(),
    progress: {},
    settings: {},
    lists: (data && data.lists) || [],
    series: (data && data.series) || [],
  });
  return parsed.success ? parsed.data : null;
}

const without = (items, gone) => items.filter((x) => !gone[x.id]);

/**
 * Works out what a sync should do, without touching storage or the network.
 * `cloud` is the stored data ({ lists, series, deleted }) or null.
 *
 * @returns {{ ok: true, merge: object, lists: object[], series: object[],
 *             deleted: object, pushNeeded: boolean, dropLocal: { lists: string[], series: string[] } }
 *          | { ok: false, error: string }}
 */
export function planCloudSync(localSnapshot, localDeleted, cloud, now = Date.now()) {
  const deleted = pruneDeleted(unionDeleted(localDeleted, (cloud && cloud.deleted) || {}), now);
  const incoming = lessonsOnlySnapshot({
    lists: without((cloud && cloud.lists) || [], deleted),
    series: without((cloud && cloud.series) || [], deleted),
  });
  if (!incoming) return { ok: false, error: "The saved copy of your lessons couldn't be read." };

  const merge = mergeSnapshots(localSnapshot, incoming, { mode: "merge" });
  const merged = {
    lists: merge.listsChanged ? merge.lists : localSnapshot.lists,
    series: merge.seriesChanged ? merge.series : localSnapshot.series,
  };
  // Lessons deleted on another device go from this one too.
  const dropLocal = {
    lists: merged.lists.filter((l) => deleted[l.id]).map((l) => l.id),
    series: merged.series.filter((s) => deleted[s.id]).map((s) => s.id),
  };
  const lists = without(merged.lists, deleted);
  const series = without(merged.series, deleted);

  const before = JSON.stringify({
    lists: (cloud && cloud.lists) || [],
    series: (cloud && cloud.series) || [],
    deleted: (cloud && cloud.deleted) || {},
  });
  const after = JSON.stringify({ lists, series, deleted });
  return { ok: true, merge, lists, series, deleted, pushNeeded: before !== after, dropLocal };
}

/**
 * Pull, merge, push. Never throws; returns { ok, ... }.
 * `client` is a Supabase client with a signed-in user.
 */
export async function syncLessons(client, userId, storage = window.localStorage) {
  const got = await client.from(TABLE).select("data").eq("user_id", userId).maybeSingle();
  if (got.error) return { ok: false, error: "Couldn't reach your account. Try again in a moment." };

  const { snapshot } = readLocalSnapshot(storage);
  const plan = planCloudSync(snapshot, loadDeleted(storage), got.data ? got.data.data : null);
  if (!plan.ok) return plan;

  const before = { lists: snapshot.lists.length, series: snapshot.series.length };
  if (!isNoOp(plan.merge)) {
    const applied = applyMergeResult(storage, plan.merge);
    if (!applied.ok) return { ok: false, error: applied.error };
  }
  try {
    saveDeleted(storage, plan.deleted);
    if (plan.dropLocal.lists.length || plan.dropLocal.series.length) {
      storage.setItem(CUSTOM_LISTS_KEY, JSON.stringify(plan.lists));
      storage.setItem(SERIES_KEY, JSON.stringify(plan.series));
    }
  } catch (err) {
    return { ok: false, error: "This device is out of storage space." };
  }

  if (plan.pushNeeded) {
    const put = await client.from(TABLE).upsert({
      user_id: userId,
      data: { lists: plan.lists, series: plan.series, deleted: plan.deleted },
      updated_at: new Date().toISOString(),
    });
    if (put.error) return { ok: false, error: "Couldn't save to your account. Try again in a moment." };
  }
  return {
    ok: true,
    lessonsHere: plan.lists.length,
    seriesHere: plan.series.length,
    lessonsGained: Math.max(0, plan.lists.length - before.lists),
    seriesGained: Math.max(0, plan.series.length - before.series),
    pushed: plan.pushNeeded,
  };
}

/** Removes the account's saved copy (the account itself is deleted separately). */
export async function deleteCloudCopy(client, userId) {
  const res = await client.from(TABLE).delete().eq("user_id", userId);
  return res.error ? { ok: false, error: "Couldn't delete it. Try again in a moment." } : { ok: true };
}
