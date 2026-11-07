// /account — an optional, free account for using lessons and series on more
// than one device. Sign-in is by email: we send a link (and a 6-digit code),
// no password. Only lessons and series sync; practice progress stays on the
// device. Everything works without an account.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { InfoPage } from '@/components/InfoPage';
import { useAccount } from '@/lib/useAccount';
import { getSupabase } from '@/lib/supabaseClient';
import { deleteCloudCopy } from '@/lib/cloudSync';
import { demoAccounts, smtpConfigured } from '@/lib/supabaseClient';
import { DEMO_CODE } from '@/lib/demoAccounts';

const buttonPrimary =
  'rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50';
const buttonQuiet =
  'inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';
const card = 'holo-card relative rounded-2xl p-5 sm:p-6';
const field =
  'mt-2 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

function SignIn({ account }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(e) {
    e.preventDefault();
    if (busy || !email.trim()) return;
    setBusy(true);
    setError('');
    const res = await account.sendLink(email.trim());
    setBusy(false);
    if (res.ok) setSent(true);
    else setError(res.error);
  }

  async function verify(e) {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setError('');
    const res = await account.verifyCode(email.trim(), code);
    setBusy(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className={card} data-testid="account-signin">
      <h2 className="type-card font-display text-xl font-bold text-foreground">
        {sent ? 'Check your email' : 'Sign in or create a free account'}
      </h2>
      {!sent ? (
        <form onSubmit={send}>
          <p className="mt-2 type-body text-sm text-muted-foreground">
            Type your email address and we'll send you a link. Open it on this device and you're in. No
            password to remember, and the same link works whether you're new or coming back.
          </p>
          <label htmlFor="account-email" className="mt-5 block text-sm font-semibold text-foreground">
            Email address
          </label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={field}
            data-testid="account-email"
          />
          {error && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="mt-5">
            <button type="submit" disabled={busy || !email.trim()} className={buttonPrimary} data-testid="account-send">
              {busy ? 'Sending…' : 'Send me a link'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          <p className="mt-2 type-body text-sm text-muted-foreground" role="status">
            We've sent an email to <span className="font-semibold text-foreground">{email.trim()}</span>. Check your
            email and click on the link to log in.
          </p>
          <p className="mt-3 type-body text-sm text-muted-foreground" data-testid="account-junk-note">
            Please check your junk folder.
            {!smtpConfigured() && (
              <>
                {' '}
                The email will appear from{' '}
                <span className="font-mono text-foreground">Supabase Auth &lt;noreply@mail.app.supabase.io&gt;</span>.
                This is okay!
              </>
            )}
          </p>
          {smtpConfigured() ? (
          <form onSubmit={verify} className="mt-5">
            <label htmlFor="account-code" className="block text-sm font-semibold text-foreground">
              Reading the email on another device? Type the code from it instead
            </label>
            <input
              id="account-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              className={field + ' max-w-[12rem] font-mono'}
              data-testid="account-code"
            />
            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" disabled={busy || !code.trim()} className={buttonPrimary}>
                Sign in with the code
              </button>
              <button type="button" onClick={() => { setSent(false); setError(''); setCode(''); }} className={buttonQuiet}>
                Use a different address
              </button>
            </div>
          </form>
          ) : (
            <div className="mt-5">
              <button type="button" onClick={() => { setSent(false); setError(''); }} className={buttonQuiet}>
                Use a different address
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SignedIn({ account }) {
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState('');
  const { sync, user } = account;
  const last = sync.last;

  async function removeCopy() {
    const res = await deleteCloudCopy(getSupabase(), user.id);
    setConfirming(false);
    setNotice(res.ok ? 'Your online copy is deleted. The lessons on this device are untouched.' : res.error);
  }

  async function deleteAccount() {
    const client = getSupabase();
    const res = await client.rpc('delete_my_account');
    setConfirming(false);
    if (res.error) {
      setNotice("We couldn't delete the account. Try again in a moment.");
      return;
    }
    await account.signOut();
  }

  return (
    <div className="space-y-6">
      <div className={card} data-testid="account-signedin">
        <h2 className="type-card font-display text-xl font-bold text-foreground">You're signed in</h2>
        <p className="mt-2 type-body text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{user.email}</span>
        </p>

        <p className="mt-4 type-body text-sm text-foreground" role="status" data-testid="account-sync-status">
          {sync.state === 'syncing' && 'Syncing your lessons…'}
          {sync.state === 'error' && <span className="text-destructive">{sync.message}</span>}
          {sync.state === 'done' && last && (
            <>
              Up to date. {plural(last.lessonsHere, 'lesson', 'lessons')} and {plural(last.seriesHere, 'series', 'series')} are
              kept in your account.
              {(last.lessonsGained > 0 || last.seriesGained > 0) && (
                <>
                  {' '}
                  Brought over {plural(last.lessonsGained, 'lesson', 'lessons')} and{' '}
                  {plural(last.seriesGained, 'series', 'series')} from your account.{' '}
                  <Link to="/custom" className="underline underline-offset-2 hover:text-primary">
                    See your lessons
                  </Link>
                </>
              )}
            </>
          )}
          {sync.state === 'idle' && 'Ready to sync.'}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => account.syncNow()} disabled={sync.state === 'syncing'} className={buttonPrimary} data-testid="account-sync-now">
            Sync now
          </button>
          <button type="button" onClick={() => account.signOut()} className={buttonQuiet} data-testid="account-signout">
            Sign out
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Lessons and series sync on their own while you're signed in. Signing out keeps the lessons on this device.
        </p>
      </div>

      <div className={card}>
        <h2 className="type-card font-display text-lg font-bold text-foreground">Your data</h2>
        <p className="mt-2 type-body text-sm text-muted-foreground">
          We keep your email address and your lessons and series. Practice progress stays on your device. You can remove
          your online copy, or delete the account and everything in it.
        </p>
        {notice && (
          <p className="mt-3 text-sm text-foreground" role="status">
            {notice}
          </p>
        )}
        {!confirming ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => setConfirming('copy')} className={buttonQuiet}>
              Delete my online copy
            </button>
            <button type="button" onClick={() => setConfirming('account')} className={buttonQuiet} data-testid="account-delete">
              Delete my account
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm" role="alertdialog">
            <span className="text-muted-foreground">
              {confirming === 'account'
                ? 'Delete your account and online copy? Lessons on this device stay.'
                : 'Delete the copy in your account? It will be uploaded again at the next sync while you stay signed in.'}
            </span>
            <button
              type="button"
              onClick={confirming === 'account' ? deleteAccount : removeCopy}
              className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:opacity-90"
            >
              Yes, delete
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={buttonQuiet}>
              Keep it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountPage() {
  const account = useAccount();

  return (
    <InfoPage
      path="/account"
      title="Your account"
      description="An optional free account to use your lessons and series on more than one device."
      eyebrow="Optional"
      heading="Use it on more than one device"
      intro="You don't need an account. Lessons and series are kept in this browser, and that's fine on one computer. If you want them on a phone, a tablet or a school computer too, make a free account and they follow you."
      art={undefined}
    >
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {demoAccounts() && (
            <p className="rounded-xl border-2 border-warning/50 bg-warning/10 p-4 text-sm text-foreground" role="note" data-testid="account-demo-note">
              <span className="font-semibold">Practice mode.</span> No email is sent and nothing leaves this browser. Use any
              email address and the code <span className="font-mono">{DEMO_CODE}</span>.
            </p>
          )}
          {!account.enabled ? (
            <div className={card}>
              <p className="type-body text-sm text-muted-foreground">
                Accounts aren't switched on yet. Your lessons are safe in this browser, and you can back them up or
                move them on the{' '}
                <Link to="/sync" className="underline underline-offset-2 hover:text-primary">
                  save page
                </Link>
                .
              </p>
            </div>
          ) : !account.ready ? (
            <div className={card}>
              <p className="text-sm text-muted-foreground" role="status">
                One moment…
              </p>
            </div>
          ) : account.user ? (
            <SignedIn account={account} />
          ) : (
            <SignIn account={account} />
          )}
          <p className="type-body text-xs text-muted-foreground">
            What the account is for: keeping your lessons and series in step across your devices. We don't need a
            child's name, and we don't use your email for anything else. You can still back up by file on the{' '}
            <Link to="/sync" className="underline underline-offset-2 hover:text-primary">
              save page
            </Link>
            .
          </p>
        </div>
      </section>
    </InfoPage>
  );
}
