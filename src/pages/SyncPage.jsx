// /sync — save progress, move it to another device, or restore it.
//
// There are no accounts, so progress lives only in this browser. This page
// makes a copy that can travel (a file, a link, or a QR code) and brings one
// back. Nothing is uploaded: a link keeps the copy after the "#", which
// browsers never send to a server. See lib/syncSnapshot.js.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InfoPage } from '@/components/InfoPage';
import { useYearsConfig } from '@/lib/yearData';
import {
  MAX_FILE_BYTES,
  buildSyncUrl,
  decodePayload,
  encodePayload,
  parseSnapshotText,
  readPayloadFromText,
  snapshotFileName,
  snapshotToFileText,
  transportsFor,
} from '@/lib/syncSnapshot';
import { isNoOp } from '@/lib/syncMerge';
import {
  applyImport,
  currentUndo,
  prepareExport,
  previewImport,
  requestPersistence,
  undoImport,
} from '@/lib/syncService';
import { quietNudge } from '@/lib/syncNudge';

const buttonPrimary =
  'rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const buttonQuiet =
  'rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const card =
  'rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-5 sm:p-6 mt-6';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

function Card({ id, title, children }) {
  return (
    <section className={card} aria-labelledby={id}>
      <h2 id={id} className="font-display text-xl font-bold text-foreground">
        {title}
      </h2>
      <div className="mt-4 space-y-4 type-body text-sm text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function tellStorage() {
  // Asked only when someone saves or restores, never on page load: some
  // browsers show a prompt for it.
  requestPersistence();
}

// ── Save ───────────────────────────────────────────────────────────────

function SaveCard({ yearLabel }) {
  const [state, setState] = useState({ status: 'loading' });
  const [link, setLink] = useState(null); // { url, chars, link, qr }
  const [qr, setQr] = useState(null); // { status: "loading" | "ready" | "error", src }
  const [note, setNote] = useState(''); // aria-live status line
  const [canShareFile, setCanShareFile] = useState(false);
  const linkInput = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const out = await prepareExport();
        if (cancelled) return;
        setState({ status: 'ready', ...out });
        if (!out.empty) {
          const payload = await encodePayload(out.snapshot);
          const url = buildSyncUrl(window.location.origin, payload);
          if (!cancelled) setLink({ url, ...transportsFor(url) });
        }
      } catch (err) {
        if (!cancelled) setState({ status: 'error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      const probe = new File(['{}'], 'x.json', { type: 'application/json' });
      setCanShareFile(
        Boolean(navigator.canShare && navigator.canShare({ files: [probe] })),
      );
    } catch (err) {
      setCanShareFile(false);
    }
  }, []);

  const fileFor = useCallback(() => {
    const text = snapshotToFileText(state.snapshot);
    return new File([text], snapshotFileName(), { type: 'application/json' });
  }, [state.snapshot]);

  const saved = () => {
    tellStorage();
    try {
      quietNudge(window.localStorage);
    } catch (err) {
      // ignore
    }
  };

  const download = () => {
    const file = fileFor();
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    setNote(
      'Backup file saved as ' +
        file.name +
        '. Keep it somewhere safe, or send it to your other device.',
    );
    saved();
  };

  const share = async () => {
    try {
      await navigator.share({
        files: [fileFor()],
        title: 'SPELL// STARS progress',
      });
      saved();
    } catch (err) {
      if (err && err.name !== 'AbortError')
        setNote("Couldn't open sharing. Use “Download backup file” instead.");
    }
  };

  const copyLink = async () => {
    saved();
    try {
      await navigator.clipboard.writeText(link.url);
      setNote('Link copied.');
    } catch (err) {
      if (linkInput.current) linkInput.current.select();
      setNote(
        "Couldn't copy automatically. The link is selected, so you can copy it yourself.",
      );
    }
  };

  const showQr = async () => {
    saved();
    setQr({ status: 'loading' });
    try {
      const mod = await import('qrcode');
      const QRCode = mod.default || mod;
      const src = await QRCode.toDataURL(link.url, {
        errorCorrectionLevel: 'L',
        margin: 2,
        width: 560,
      });
      setQr({ status: 'ready', src });
    } catch (err) {
      setQr({ status: 'error' });
    }
  };

  if (state.status === 'loading') {
    return (
      <Card id="save-heading" title="Save or move your progress">
        <p>Getting your progress ready…</p>
      </Card>
    );
  }
  if (state.status === 'error') {
    return (
      <Card id="save-heading" title="Save or move your progress">
        <p role="alert">
          Couldn't read the progress saved on this device. Reload the page and
          try again.
        </p>
      </Card>
    );
  }

  const years = Object.entries(state.snapshot.progress).filter(
    ([, y]) => Object.keys(y.words).length > 0,
  );
  const total = years.reduce((n, [, y]) => n + Object.keys(y.words).length, 0);

  return (
    <Card id="save-heading" title="Save or move your progress">
      {state.empty ? (
        <p data-testid="sync-nothing-to-save">
          There's nothing to save yet. Once you've practised some words on this
          device, come back here to make a copy.
        </p>
      ) : (
        <p data-testid="sync-summary">
          On this device: {plural(total, 'word', 'words')} practised
          {years.length > 0 &&
            ' (' +
              years
                .map(
                  ([slug, y]) =>
                    yearLabel(slug) + ': ' + Object.keys(y.words).length,
                )
                .join(', ') +
              ')'}
          . The copy also keeps each year's current week
          {state.snapshot.lists.length > 0 &&
            ' and your ' +
              plural(
                state.snapshot.lists.length,
                'custom list',
                'custom lists',
              )}
          .
        </p>
      )}

      {state.failed.length > 0 && (
        <p
          role="alert"
          className="rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-foreground"
          data-testid="sync-failed-years"
        >
          Progress for {state.failed.map(yearLabel).join(', ')} couldn't be
          prepared just now, so it is <strong>not</strong> in this copy. Check
          your connection and reload this page to include it.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={buttonPrimary}
          onClick={download}
          disabled={state.empty}
          data-testid="sync-download"
        >
          Download backup file
        </button>
        {canShareFile && (
          <button
            type="button"
            className={buttonQuiet}
            onClick={share}
            disabled={state.empty}
            data-testid="sync-share"
          >
            Share file…
          </button>
        )}
      </div>

      {!state.empty && link && (
        <div className="space-y-3 border-t border-foreground/10 pt-4">
          <h3 className="font-semibold text-foreground">
            Or use a link or QR code
          </h3>
          {link.link ? (
            <>
              <p data-testid="sync-link-warning">
                Anyone with this link can see which words have been practised,
                and links don't expire. Send it only to yourself or to people
                you trust. It isn't stored anywhere; the copy is inside the link
                itself.
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={linkInput}
                  readOnly
                  value={link.url}
                  onFocus={(e) => e.target.select()}
                  aria-label="Link that carries your progress"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                  data-testid="sync-link-input"
                />
                <button
                  type="button"
                  className={buttonQuiet}
                  onClick={copyLink}
                  data-testid="sync-copy-link"
                >
                  Copy link
                </button>
              </div>
              {link.qr ? (
                <div>
                  {!qr && (
                    <button
                      type="button"
                      className={buttonQuiet}
                      onClick={showQr}
                      data-testid="sync-show-qr"
                    >
                      Show QR code
                    </button>
                  )}
                  {qr && qr.status === 'loading' && <p>Making the QR code…</p>}
                  {qr && qr.status === 'error' && (
                    <p role="alert">
                      Couldn't make a QR code. Use the link or file instead.
                    </p>
                  )}
                  {qr && qr.status === 'ready' && (
                    <div>
                      <img
                        src={qr.src}
                        alt="QR code that carries your progress. Scan it with the camera on your other device."
                        className="h-auto w-full max-w-xs rounded-xl bg-white p-2"
                        data-testid="sync-qr"
                      />
                      <p className="mt-2">
                        On your other device, point the camera at this and open
                        the link it shows.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p data-testid="sync-qr-too-big">
                  There's too much progress to fit in a QR code that is easy to
                  scan. Use the link or the backup file.
                </p>
              )}
            </>
          ) : (
            <p data-testid="sync-link-too-big">
              There's too much progress to fit in a link that messaging apps
              will reliably keep whole. Use the backup file instead.
            </p>
          )}
        </div>
      )}

      <p
        aria-live="polite"
        className="min-h-[1.25rem] text-foreground"
        data-testid="sync-note"
      >
        {note}
      </p>
    </Card>
  );
}

// ── Restore ────────────────────────────────────────────────────────────

function PreviewSummary({ result, yearLabel }) {
  const s = result.summary;
  const rows = Object.entries(s.years);
  return (
    <div className="space-y-2" data-testid="sync-preview">
      {rows.length > 0 && (
        <ul className="space-y-1">
          {rows.map(([slug, c]) => (
            <li key={slug}>
              <strong className="text-foreground">{yearLabel(slug)}:</strong>{' '}
              {[
                c.added && plural(c.added, 'new word', 'new words'),
                c.updated && plural(c.updated, 'word', 'words') + ' updated',
                c.removed && plural(c.removed, 'word', 'words') + ' removed',
                c.unchanged &&
                  plural(c.unchanged, 'word', 'words') + ' already the same',
              ]
                .filter(Boolean)
                .join(', ') || 'nothing to change'}
            </li>
          ))}
        </ul>
      )}
      {s.lists &&
        s.lists.added +
          s.lists.updated +
          s.lists.removed +
          s.lists.unchanged +
          s.lists.skipped >
          0 && (
          <p data-testid="sync-preview-lists">
            <strong className="text-foreground">Custom lists:</strong>{' '}
            {[
              s.lists.added && plural(s.lists.added, 'new list', 'new lists'),
              s.lists.updated &&
                plural(s.lists.updated, 'list', 'lists') + ' updated',
              s.lists.removed &&
                plural(s.lists.removed, 'list', 'lists') + ' removed',
              s.lists.unchanged &&
                plural(s.lists.unchanged, 'list', 'lists') +
                  ' already the same',
              s.lists.skipped &&
                plural(s.lists.skipped, 'list', 'lists') +
                  ' not added (a device keeps up to 20)',
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      {s.skippedYears.length > 0 && (
        <p role="alert" className="text-foreground">
          {s.skippedYears.map(yearLabel).join(', ')} can't be updated right now
          (this device's saved progress for it couldn't be prepared), so it will
          be left as it is.
        </p>
      )}
    </div>
  );
}

function RestoreCard({ yearLabel }) {
  const [initialPayload] = useState(() => {
    try {
      return readPayloadFromText(window.location.hash);
    } catch (err) {
      return null;
    }
  });
  const [incoming, setIncoming] = useState(null); // validated snapshot
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pasted, setPasted] = useState('');
  const [mode, setMode] = useState('merge');
  const [useWeeks, setUseWeeks] = useState(false);
  const [copySettings, setCopySettings] = useState(false);
  const [preview, setPreview] = useState(null); // { result, failed }
  const [applied, setApplied] = useState(null); // { summary }
  const [undo, setUndo] = useState(() => {
    try {
      return currentUndo();
    } catch (err) {
      return null;
    }
  });
  const [message, setMessage] = useState('');
  const settingsChangedRef = useRef(false);

  const load = useCallback((snapshot) => {
    setIncoming(snapshot);
    setError('');
    setApplied(null);
    setMode('merge');
    setUseWeeks(false);
    setCopySettings(false);
  }, []);

  // A link opened on this page carries its copy after the "#". Read it, then
  // take it out of the address bar so it isn't left in history or shared by
  // accident.
  useEffect(() => {
    if (!initialPayload) return undefined;
    let cancelled = false;
    try {
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      );
    } catch (err) {
      // ignore
    }
    setBusy(true);
    decodePayload(initialPayload).then((r) => {
      if (cancelled) return;
      setBusy(false);
      if (r.ok) load(r.snapshot);
      else setError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [initialPayload, load]);

  // Work out what applying would do, again whenever a choice changes.
  useEffect(() => {
    if (!incoming) {
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    setBusy(true);
    previewImport(incoming, { mode, useIncomingWeeks: useWeeks, copySettings })
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Couldn't read the progress saved on this device. Reload the page and try again.",
          );
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [incoming, mode, useWeeks, copySettings]);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setIncoming(null);
      setError('That file is too large to be a SPELL// STARS backup.');
      return;
    }
    try {
      const r = parseSnapshotText(await file.text());
      if (r.ok) load(r.snapshot);
      else {
        setIncoming(null);
        setError(r.message);
      }
    } catch (err) {
      setIncoming(null);
      setError("Couldn't read that file.");
    }
  };

  const onCheckPasted = async () => {
    const payload = readPayloadFromText(pasted);
    if (!payload) {
      setIncoming(null);
      setError(
        "That doesn't look like a SPELL// STARS link. Paste the whole link, or use the backup file.",
      );
      return;
    }
    setBusy(true);
    const r = await decodePayload(payload);
    setBusy(false);
    if (r.ok) {
      load(r.snapshot);
      setPasted('');
    } else {
      setIncoming(null);
      setError(r.message);
    }
  };

  const cancel = () => {
    setIncoming(null);
    setPreview(null);
    setError('');
  };

  const apply = () => {
    tellStorage();
    const out = applyImport(preview.result);
    if (!out.ok) {
      setError(out.error);
      return;
    }
    settingsChangedRef.current =
      preview.result.summary.settingsChanged.length > 0;
    setApplied({ summary: preview.result.summary });
    setUndo(currentUndo());
    setIncoming(null);
    setPreview(null);
    setMessage('');
  };

  const doUndo = () => {
    const ok = undoImport();
    setUndo(null);
    setApplied(null);
    setMessage(
      ok
        ? 'Undone. Your progress is back as it was before.'
        : "There's nothing to undo any more.",
    );
    if (settingsChangedRef.current) settingsChangedRef.current = 'reload';
  };

  const result = preview && preview.result;
  const hasSettings = incoming && Object.keys(incoming.settings).length > 0;
  const weekDiffers =
    result && result.summary.weekDiffers.length > 0 && mode === 'merge';
  const noOp = result && isNoOp(result);
  const needsReload =
    settingsChangedRef.current === true ||
    settingsChangedRef.current === 'reload';

  return (
    <Card id="restore-heading" title="Restore on this device">
      <p>
        Open a backup file, or paste a link, from another device. You'll see
        what would change before anything is saved, and you can undo it for a
        few minutes afterwards.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={
            buttonPrimary +
            ' cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background'
          }
        >
          Choose backup file
          <input
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={onFile}
            data-testid="sync-file-input"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="sync-paste"
          className="block font-semibold text-foreground"
        >
          Or paste a link
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="sync-paste"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
            data-testid="sync-paste-input"
          />
          <button
            type="button"
            className={buttonQuiet}
            onClick={onCheckPasted}
            disabled={!pasted.trim() || busy}
            data-testid="sync-paste-check"
          >
            Check link
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-foreground"
          data-testid="sync-error"
        >
          {error}
        </p>
      )}
      {busy && !result && <p>Checking…</p>}

      {incoming && result && (
        <div className="space-y-4 border-t border-foreground/10 pt-4">
          <h3 className="font-semibold text-foreground">
            Backup made {incoming.exportedAt.slice(0, 10)}
          </h3>

          <fieldset className="space-y-2">
            <legend className="sr-only">
              How to combine it with this device
            </legend>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="sync-mode"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
                className="mt-1"
                data-testid="sync-mode-merge"
              />
              <span>
                <strong className="text-foreground">
                  Merge (recommended).
                </strong>{' '}
                Keep the most practised version of each word from both.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="sync-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="mt-1"
                data-testid="sync-mode-replace"
              />
              <span>
                <strong className="text-foreground">Replace.</strong> Make this
                device match the backup exactly. Words and years that aren't in
                it are removed.
              </span>
            </label>
          </fieldset>

          <PreviewSummary result={result} yearLabel={yearLabel} />

          {weekDiffers && (
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={useWeeks}
                onChange={(e) => setUseWeeks(e.target.checked)}
                className="mt-1"
                data-testid="sync-use-weeks"
              />
              <span>
                Also use the backup's current week (
                {result.summary.weekDiffers
                  .map(
                    (d) =>
                      yearLabel(d.slug) +
                      ': week ' +
                      d.there +
                      ' instead of ' +
                      d.here,
                  )
                  .join('; ')}
                ).
              </span>
            </label>
          )}
          {hasSettings && (
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={copySettings}
                onChange={(e) => setCopySettings(e.target.checked)}
                className="mt-1"
                data-testid="sync-copy-settings"
              />
              <span>
                Also copy display settings (theme, text size, timer and so on).
              </span>
            </label>
          )}

          {noOp && (
            <p data-testid="sync-noop">
              This device already has everything in this backup.
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={buttonPrimary}
              onClick={apply}
              disabled={busy || noOp}
              data-testid="sync-apply"
            >
              {mode === 'replace' ? 'Replace and save' : 'Merge and save'}
            </button>
            <button
              type="button"
              className={buttonQuiet}
              onClick={cancel}
              data-testid="sync-cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {applied && (
        <div
          className="space-y-3 rounded-xl border border-primary/30 bg-primary/10 p-4"
          role="status"
          data-testid="sync-applied"
        >
          <p className="text-foreground">
            Done.{' '}
            {applied.summary.added + applied.summary.updated > 0
              ? plural(
                  applied.summary.added + applied.summary.updated,
                  'word',
                  'words',
                ) + ' added or updated.'
              : 'Your settings were updated.'}
          </p>
        </div>
      )}

      {undo && (
        <div
          className="flex flex-wrap items-center gap-3"
          data-testid="sync-undo-area"
        >
          <button
            type="button"
            className={buttonQuiet}
            onClick={doUndo}
            data-testid="sync-undo"
          >
            Undo the last restore
          </button>
          <span>Available for 10 minutes.</span>
        </div>
      )}

      {needsReload && (applied || message) && (
        <div>
          <p>Display settings changed. Reload the page to see them.</p>
          <button
            type="button"
            className={buttonQuiet + ' mt-2'}
            onClick={() => window.location.reload()}
            data-testid="sync-reload"
          >
            Reload
          </button>
        </div>
      )}

      <p aria-live="polite" className="min-h-[1.25rem] text-foreground">
        {message}
      </p>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function SyncPage() {
  const { yearsConfig } = useYearsConfig();
  const labels = useMemo(() => {
    const map = {};
    for (const y of yearsConfig ? yearsConfig.years : []) map[y.slug] = y.label;
    return map;
  }, [yearsConfig]);
  const yearLabel = useCallback((slug) => labels[slug] || slug, [labels]);

  return (
    <InfoPage
      path="/sync"
      title="Save or move your progress"
      description="Save SPELL// STARS progress to a file, a link or a QR code, and restore it on another device. No account needed."
      eyebrow="No account needed"
      heading="Save or move your progress"
      intro="SPELL// STARS keeps progress in this browser, and nothing is sent to us. To carry on somewhere else, or to keep a safe copy, make a backup here and open it on the other device."
    >
      {/* Not for search results: this page is a tool, and a link to it can
          carry someone's progress. */}
      <meta name="robots" content="noindex" />
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <SaveCard yearLabel={yearLabel} />
          <RestoreCard yearLabel={yearLabel} />
          <p className="type-body text-xs text-muted-foreground">
            Good to know: browsers can clear a site's saved data if it isn't
            used for a while, or if you clear your history. A backup file is the
            safest copy. Progress is stored per browser, so the same child on
            two browsers or devices has two separate copies until you combine
            them here.
          </p>
        </div>
      </section>
    </InfoPage>
  );
}
