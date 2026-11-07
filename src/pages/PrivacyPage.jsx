// /privacy — what the site keeps, where, and who can see it. Written in plain
// English. Keep it in step with what the site really does: if you add
// something that stores or sends personal data, update this page.
import { Link } from 'react-router-dom';
import { InfoPage } from '@/components/InfoPage';
import { accountsConfigured } from '@/lib/supabaseClient';

const UPDATED = '7 November 2026';

const card = 'holo-card relative rounded-2xl p-5 sm:p-6';
const h2 = 'type-card font-display text-xl font-bold text-foreground';
const p = 'mt-2 type-body text-sm leading-relaxed text-muted-foreground';
const ul = 'mt-3 list-disc space-y-1.5 pl-5 type-body text-sm leading-relaxed text-muted-foreground';
const link = 'underline underline-offset-2 hover:text-primary';

export default function PrivacyPage() {
  return (
    <InfoPage
      path="/privacy"
      title="Privacy"
      description="What SPELL// STARS keeps on your device, what an optional account stores, and what the site's analytics collect."
      eyebrow="Your data"
      heading="Privacy, in plain English"
      intro="Most of what you do on SPELL// STARS stays on your own device. This page says what is kept, where, and what you can do about it."
    >
      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className={card}>
            <h2 className={h2}>The short version</h2>
            <ul className={ul}>
              <li>You don't need an account. Practice, lessons and series are kept in your browser.</li>
              <li>
                {accountsConfigured()
                  ? "An optional free account keeps your lessons and series in step across your devices. It stores your email address and those lessons. Nothing else."
                  : "An optional account, to use lessons on more than one device, is on its way. This page will be kept up to date when it arrives."}
              </li>
              <li>We don't ask for a child's name, and we don't sell your data or show advertising.</li>
              <li>Google Analytics only runs if you say yes in the cookie banner. A second tool counts visits without cookies (see below).</li>
            </ul>
          </div>

          <div className={card}>
            <h2 className={h2}>What stays on your device</h2>
            <p className={p}>
              Your practice progress, badges, settings (like text size and theme), lessons, series and any learner names
              you add are saved in your browser's own storage. They don't come to us. That's why clearing your browser's
              data removes them, and why the{' '}
              <Link to="/sync" className={link}>
                save page
              </Link>{' '}
              can back them up to a file, link or QR code that you keep.
            </p>
            <p className={p}>
              Learner names, if you add them, are only labels on your device. A backup file, link or QR code contains
              whatever you chose to back up, so keep it as private as you'd keep a photo of your child's work. A shared
              lesson link carries the lesson's words inside the link itself, after the <span className="font-mono">#</span>
              , which browsers don't send to our servers.
            </p>
          </div>

          <div className={card} data-testid="privacy-account">
            <h2 className={h2}>If you make an account</h2>
            <p className={p}>An account is optional and for adults. When you make one:</p>
            <ul className={ul}>
              <li>
                We store your <strong>email address</strong> and a copy of your <strong>lessons and series</strong> (their
                names and words), so they can follow you to your other devices.
              </li>
              <li>We don't store a password. You sign in with a link we email you.</li>
              <li>Practice progress, badges and learner names are not uploaded.</li>
              <li>
                The account service is run for us by Supabase, which keeps the data on its servers and sends the sign-in
                emails.
              </li>
              <li>We use your email only to let you sign in. We don't send marketing.</li>
            </ul>
            <p className={p}>
              You can delete your online copy, or the whole account, on the{' '}
              <Link to="/account" className={link}>
                account page
              </Link>
              . That removes your email and everything we stored. Lessons on your own devices stay.
            </p>
          </div>

          <div className={card}>
            <h2 className={h2}>The feedback form</h2>
            <p className={p}>
              The message you type is stored so we can read it. We don't ask who you are. If you add an email address or
              other way to reply, we keep that with your message. Please don't put a child's full name or other personal
              details in it. If you want a message of yours removed, tell us on the{' '}
              <Link to="/feedback" className={link}>
                feedback page
              </Link>{' '}
              and say which one.
            </p>
          </div>

          <div className={card}>
            <h2 className={h2}>Analytics, fonts and hosting</h2>
            <ul className={ul}>
              <li>
                <strong>Google Analytics</strong> counts visits and which pages are used, with the type of device and
                roughly where in the world. It uses cookies, so we only switch it on if you say yes in the cookie
                banner. You can change your mind at any time with "Cookie settings" at the bottom of every page, and
                saying no removes the cookies it set. We keep the part of a page address
                after <span className="font-mono">#</span> out of what it receives, so backups and shared links aren't
                sent to Google.
              </li>
              <li>
                <strong>Cloudflare Web Analytics</strong> also counts visits, without using cookies to follow you around.
              </li>
              <li>
                <strong>Cloudflare</strong> hosts the site, so it sees the technical details of each request, such as your
                IP address, in its normal logs.
              </li>
              <li>
                <strong>Google Fonts</strong> supplies some lettering, so your browser asks Google for it.
              </li>
            </ul>
          </div>

          <div className={card}>
            <h2 className={h2}>Children</h2>
            <p className={p}>
              The site is made for children to practise spelling, with a parent or teacher in charge. Children don't need
              an account and are never asked for their name, their school or an email address.
            </p>
          </div>

          <div className={card}>
            <h2 className={h2}>Your choices</h2>
            <p className={p}>
              You can ask what we hold about you, ask us to correct or delete it, or object to how it's used. Signed-in
              people can delete their account themselves. For anything else, contact us on the{' '}
              <Link to="/feedback" className={link}>
                feedback page
              </Link>
              . If you're in the UK and we can't sort it out, you can complain to the Information Commissioner's Office
              at <span className="font-mono">ico.org.uk</span>.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">Last updated {UPDATED}.</p>
          </div>
        </div>
      </section>
    </InfoPage>
  );
}
