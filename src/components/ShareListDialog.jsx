// "Challenge someone": a dialog with the share link for a custom list and
// three ways to send it (copy, WhatsApp, email), plus the phone's own share
// sheet where the browser has one. The link opens /shared, where the
// receiver can add the words to their own lists.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Mail, MessageCircle, QrCode, Share2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { buildQrUrl, buildShareUrl, shareMessage } from "@/lib/shareList";

const OPTION =
  "press-soft inline-flex items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-foreground/5 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10";

export function ShareListDialog({ list, triggerClassName }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);
  const timer = useRef(null);

  const { url, sentencesDropped } = useMemo(
    () => buildShareUrl(list, window.location.origin),
    [list],
  );
  const qrSource = useMemo(() => buildQrUrl(list, window.location.origin), [list]);
  const [qr, setQr] = useState(null); // { status: "loading" | "ready" | "error", src }
  const message = shareMessage(list);
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!open) {
      setCopied(false);
      setQr(null);
    }
  }, [open]);
  useEffect(() => {
    setQr(null);
  }, [url]);

  const showQr = async () => {
    if (!qrSource) return;
    setQr({ status: "loading" });
    try {
      // Loaded only when asked for, so it doesn't add to the page's weight.
      const mod = await import("qrcode");
      const QRCode = mod.default || mod;
      const src = await QRCode.toDataURL(qrSource.url, { errorCorrectionLevel: "L", margin: 2, width: 560 });
      setQr({ status: "ready", src });
    } catch (err) {
      setQr({ status: "error" });
    }
  };

  const copyLink = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch (err) {
      // Older browsers and non-secure pages: select the text and copy it.
      try {
        inputRef.current?.select();
        ok = document.execCommand("copy");
      } catch (err2) {
        ok = false;
      }
    }
    if (!ok) inputRef.current?.select();
    setCopied(ok);
    clearTimeout(timer.current);
    if (ok) timer.current = setTimeout(() => setCopied(false), 2500);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: "SPELL// STARS challenge", text: message, url });
    } catch (err) {
      // Cancelled by the person: nothing to do.
    }
  };

  const whatsappHref = "https://wa.me/?text=" + encodeURIComponent(message + " " + url);
  const emailHref =
    "mailto:?subject=" + encodeURIComponent("A spelling challenge for you") +
    "&body=" + encodeURIComponent(message + "\n\n" + url + "\n\nOpen the link to add these words to your own lists.");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className={triggerClassName} data-testid="custom-share-button">
          <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> Share
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md border-foreground/15 bg-popover text-foreground" data-testid="share-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-extrabold">Challenge someone!</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Send this link. When they open it they can add these {list.words.length} words to their own lists and try
            them for themselves. Only the words are shared, never your progress.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              aria-label="Share link"
              className="min-w-0 flex-1 truncate rounded-xl border border-foreground/15 bg-foreground/5 px-3 py-2.5 font-mono text-xs text-foreground"
              data-testid="share-link-input"
            />
            <button type="button" onClick={copyLink} className={OPTION + " shrink-0"} data-testid="share-copy">
              {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="sr-only" role="status" aria-live="polite">{copied ? "Link copied to clipboard" : ""}</p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={OPTION} data-testid="share-whatsapp">
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp
            </a>
            <a href={emailHref} className={OPTION} data-testid="share-email">
              <Mail className="h-4 w-4" aria-hidden="true" /> Email
            </a>
            <button
              type="button"
              onClick={showQr}
              disabled={!qrSource || (qr && qr.status !== "error")}
              aria-expanded={Boolean(qr)}
              className={OPTION + " disabled:opacity-60"}
              data-testid="share-qr-button"
            >
              <QrCode className="h-4 w-4" aria-hidden="true" /> QR code
            </button>
          </div>

          {!qrSource && (
            <p className="text-xs text-muted-foreground" data-testid="share-qr-too-big">
              This list has too many words to fit in a QR code that scans easily. Use the link instead.
            </p>
          )}
          {qr && qr.status === "loading" && <p className="text-sm text-muted-foreground">Making the QR code…</p>}
          {qr && qr.status === "error" && (
            <p className="text-sm text-destructive" role="alert">Couldn't make a QR code. Use the link instead.</p>
          )}
          {qr && qr.status === "ready" && (
            <div className="flex flex-col items-center gap-3" data-testid="share-qr">
              <img
                src={qr.src}
                alt={"QR code for the " + list.name + " spelling challenge. Scan it with a phone camera and open the link it shows."}
                className="h-auto w-full max-w-[16rem] rounded-xl bg-white p-2"
              />
              <p className="text-center text-xs text-muted-foreground">
                Point a phone camera at this and open the link it shows.
                {qrSource.sentencesDropped && " Example sentences are left out so the code stays easy to scan."}
              </p>
              <a
                href={qr.src}
                download={"spell-stars-" + list.id + "-qr.png"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                data-testid="share-qr-download"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> Save the image
              </a>
            </div>
          )}

          {canNativeShare && (
            <button type="button" onClick={nativeShare} className={OPTION + " w-full"} data-testid="share-native">
              <Share2 className="h-4 w-4" aria-hidden="true" /> More ways to share
            </button>
          )}

          {sentencesDropped && (
            <p className="text-xs text-muted-foreground">
              This list is long, so the example sentences were left out to keep the link short. The words are all there.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
