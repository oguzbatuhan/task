// Supabase backup: sign in with Google; data is written to ONE shared table in Supabase
// (default: app_backups). Each app uses its own row: (user_id, app) = ("task").
// So Daily / Flow / Tasks data never get mixed up even though they share the same table.
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = import.meta.env.VITE_SUPABASE_TABLE || "app_backups";

// This app's identity in the table. Do not change it: it is the key that separates the data from the other apps.
export const APP_ID = "task";

export const cloudConfigured = Boolean(URL && KEY);

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.code = "auth";
  }
}

// The three apps run on the same domain (github.io), so the session key is specific to each app.
const supabase = cloudConfigured
  ? createClient(URL, KEY, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: APP_ID + "-supabase-auth",
      },
    })
  : null;

// Redirects to Google; after sign-in the page returns to this address (it must be in Supabase > Redirect URLs).
export async function signIn() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + import.meta.env.BASE_URL,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw new Error(error.message);
}

// scope "local": signs out of this app only, the other apps are not affected.
export async function signOut() {
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {}
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

// Returns the current user; throws AuthError when there is no session.
export async function requireUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // A network error does not clear the session; only count this attempt as failed
    if (/retryable|fetch/i.test(error.name + " " + error.message)) {
      throw new Error("Could not reach the server. Will retry when the connection returns.");
    }
    throw new AuthError(error.message);
  }
  if (!data.session) throw new AuthError("No session");
  return data.session.user;
}

function toError(error) {
  if (error.status === 401 || error.code === "PGRST301" || error.code === "PGRST303") {
    return new AuthError("Session expired");
  }
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new Error("Table '" + TABLE + "' does not exist in Supabase. Run supabase/setup.sql in the SQL Editor.");
  }
  if (error.code === "42501") {
    return new Error("Access to the table was denied (RLS). Make sure you have run supabase/setup.sql.");
  }
  return new Error(error.message || "Supabase request failed");
}

// Downloads this app's data. Returns null when there is no row.
export async function downloadData() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from(TABLE)
    .select("data")
    .eq("user_id", user.id)
    .eq("app", APP_ID)
    .maybeSingle();
  if (error) throw toError(error);
  return data?.data ?? null;
}

// Writes only the (user_id, app) row; never touches another app's row.
export async function uploadData(payload) {
  const user = await requireUser();
  const { error } = await supabase.from(TABLE).upsert(
    { user_id: user.id, app: APP_ID, data: payload, updated_at: new Date().toISOString() },
    { onConflict: "user_id,app" }
  );
  if (error) throw toError(error);
}
