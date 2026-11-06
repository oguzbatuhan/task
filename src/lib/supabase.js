// Supabase backup: sign in with Google; data is written to ONE shared table in Supabase
// (default: app_backups). Each app uses its own row: (user_id, app) = ("task").
// So Daily / Flow / Tasks data never get mixed up even though they share the same table.
const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = import.meta.env.VITE_SUPABASE_TABLE || "app_backups";

// This app's identity in the table. Do not change it: it is the key that separates the data from the other apps.
export const APP_ID = "task";

export const cloudConfigured = Boolean(URL && KEY);

// An error whose text is translated when it is shown (not when it is thrown), so switching the language also
// switches an error that is already on screen. `key` is a text key of lib/i18n.js.
export class TextError extends Error {
  constructor(key, params) {
    super(key);
    this.key = key;
    this.params = params;
  }
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.code = "auth";
  }
}

export class ConflictError extends Error {
  constructor() {
    super("The backup changed on another device");
    this.code = "conflict";
  }
}

// The Supabase library is large, so it is only loaded when cloud backup is actually in use (connected, or coming back
// from the Google sign-in page). Without a connection the app never downloads it.
// The three apps run on the same domain (github.io), so the session key is specific to each app.
let clientPromise = null;
function getClient() {
  if (!cloudConfigured) return Promise.resolve(null);
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(URL, KEY, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: APP_ID + "-supabase-auth",
      },
    })
  );
  return clientPromise;
}

// Redirects to Google; after sign-in the page returns to this address (it must be in Supabase > Redirect URLs).
export async function signIn() {
  const supabase = await getClient();
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
  if (!cloudConfigured) return;
  try {
    const supabase = await getClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {}
}

export function onAuthChange(callback) {
  let stop = () => {};
  let closed = false;
  getClient().then((supabase) => {
    if (!supabase || closed) return;
    const { data } = supabase.auth.onAuthStateChange(callback);
    stop = () => data.subscription.unsubscribe();
  });
  return () => {
    closed = true;
    stop();
  };
}

// Returns the current user; throws AuthError when there is no session.
export async function requireUser() {
  const supabase = await getClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // A network error does not clear the session; only count this attempt as failed
    if (/retryable|fetch/i.test(error.name + " " + error.message)) {
      throw new TextError("err.unreachable");
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
    return new TextError("err.noTable", { table: TABLE });
  }
  if (error.code === "42501") {
    return new TextError("err.rls");
  }
  return error.message ? new Error(error.message) : new TextError("err.requestFailed");
}

// Downloads this app's data. Returns { data, version } where version identifies this exact copy of the row
// (null when there is no row yet); pass it back to uploadData so a newer copy is never overwritten by mistake.
export async function downloadData() {
  const user = await requireUser();
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("data, updated_at")
    .eq("user_id", user.id)
    .eq("app", APP_ID)
    .maybeSingle();
  if (error) throw toError(error);
  return { data: data?.data ?? null, version: data?.updated_at ?? null };
}

// Writes only the (user_id, app) row; never touches another app's row.
// `version` is what downloadData returned. If another device saved in between, nothing is written and a ConflictError
// is thrown, so the caller downloads again, merges and retries (no device can silently overwrite another's changes).
export async function uploadData(payload, version) {
  const user = await requireUser();
  const supabase = await getClient();
  const updated_at = new Date().toISOString();
  if (version) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ data: payload, updated_at })
      .eq("user_id", user.id)
      .eq("app", APP_ID)
      .eq("updated_at", version)
      .select("updated_at");
    if (error) throw toError(error);
    if (!data || data.length === 0) throw new ConflictError();
    return;
  }
  const { error } = await supabase.from(TABLE).insert({ user_id: user.id, app: APP_ID, data: payload, updated_at });
  if (error) {
    if (error.code === "23505") throw new ConflictError(); // another device created the row first
    throw toError(error);
  }
}
