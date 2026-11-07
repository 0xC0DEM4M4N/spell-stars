// The one connection to the account service (Supabase). It is created only if
// the site was built with REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY.
// Without them there is no account feature and the site works exactly as it
// does without one. The anon key is public by design: what a signed-in person
// can read or change is decided by the row-level rules in supabase/schema.sql.
import { createClient } from "@supabase/supabase-js";
import { createDemoClient } from "./demoAccounts";

let client;

// Set REACT_APP_SMTP_CONFIGURED=true once you have your own email sender set up
// in Supabase. Until then the emails come from Supabase's own address, and the
// sign-in page says so, so people know what to look for.
export const smtpConfigured = () => process.env.REACT_APP_SMTP_CONFIGURED === "true";

export const demoAccounts = () => process.env.REACT_APP_ACCOUNTS_DEMO === "true";

export const accountsConfigured = () =>
  demoAccounts() || Boolean(process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY);

export function getSupabase() {
  if (client !== undefined) return client;
  client = demoAccounts()
    ? createDemoClient()
    : accountsConfigured()
    ? createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
      })
    : null;
  return client;
}
