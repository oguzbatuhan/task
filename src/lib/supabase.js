// Supabase yedekleme: Google ile giriş yapılır, veriler Supabase'deki ORTAK tek tabloya
// (varsayılan: app_backups) yazılır. Her uygulama kendi satırını kullanır: (user_id, app) = ("task").
// Bu yüzden Günlük / Akış / Görevler verileri aynı tabloda olsa da asla karışmaz.
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = import.meta.env.VITE_SUPABASE_TABLE || "app_backups";

// Bu uygulamanın tablodaki kimliği. Değiştirme: veriyi diğer uygulamalardan ayıran anahtar budur.
export const APP_ID = "task";

export const cloudConfigured = Boolean(URL && KEY);

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.code = "auth";
  }
}

// Üç uygulama aynı alan adında (github.io) çalıştığı için oturum anahtarı uygulamaya özeldir.
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

// Google'a yönlendirir; giriş bitince sayfa bu adrese döner (Supabase > Redirect URLs listesinde olmalı).
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

// scope "local": yalnızca bu uygulamanın oturumunu kapatır, diğer uygulamalar etkilenmez.
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

// Geçerli kullanıcıyı döndürür; oturum yoksa AuthError fırlatır.
export async function requireUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    // Ağ hatasında oturum silinmez; sadece bu denemeyi hata say
    if (/retryable|fetch/i.test(error.name + " " + error.message)) {
      throw new Error("Sunucuya ulaşılamadı. Bağlantı gelince yeniden denenecek.");
    }
    throw new AuthError(error.message);
  }
  if (!data.session) throw new AuthError("Oturum yok");
  return data.session.user;
}

function toError(error) {
  if (error.status === 401 || error.code === "PGRST301" || error.code === "PGRST303") {
    return new AuthError("Oturum süresi doldu");
  }
  if (error.code === "42P01" || error.code === "PGRST205") {
    return new Error("Supabase'de '" + TABLE + "' tablosu yok. supabase/setup.sql dosyasını SQL Editor'da çalıştır.");
  }
  if (error.code === "42501") {
    return new Error("Tabloya erişim reddedildi (RLS). supabase/setup.sql dosyasını çalıştırdığından emin ol.");
  }
  return new Error(error.message || "Supabase isteği başarısız oldu");
}

// Bu uygulamanın verisini indirir. Satır yoksa null döner.
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

// Yalnızca (user_id, app) satırını yazar; başka uygulamanın satırına dokunmaz.
export async function uploadData(payload) {
  const user = await requireUser();
  const { error } = await supabase.from(TABLE).upsert(
    { user_id: user.id, app: APP_ID, data: payload, updated_at: new Date().toISOString() },
    { onConflict: "user_id,app" }
  );
  if (error) throw toError(error);
}
