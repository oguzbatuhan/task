// Google Drive sync: tasks are stored as a single JSON file in the user's hidden
// app data folder (appDataFolder). That folder is not visible in the Drive UI and
// only this app can access it.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const FILE_NAME = "task.json";
const API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const SILENT_TIMEOUT_MS = 15000;

export const driveConfigured = Boolean(CLIENT_ID);

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.code = "auth";
  }
}

const TOKEN_KEY = "task-drive-token";
const HINT_KEY = "task-drive-hint";

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  del(k) {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

// The access token (valid for 1 hour) is also kept locally so it survives closing the browser.
// Its scope is limited to the app's hidden appDataFolder.
function loadSavedToken() {
  try {
    const t = JSON.parse(store.get(TOKEN_KEY) || "null");
    if (t && t.token && Date.now() < t.expiresAt) return t;
  } catch {}
  return null;
}

const saved = loadSavedToken();
let accessToken = saved ? saved.token : null;
let tokenExpiresAt = saved ? saved.expiresAt : 0;
let cachedFileId = null;
let gisPromise = null;

export function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        gisPromise = null;
        reject(new Error("Google giriş betiği yüklenemedi. İnternet bağlantını kontrol et."));
      };
      document.head.appendChild(script);
    });
  }
  return gisPromise;
}

// prompt: "" -> opens the account/consent popup if needed, "none" -> tries without any popup
function requestToken(prompt) {
  return loadGoogleScript().then(
    () =>
      new Promise((resolve, reject) => {
        const hint = store.get(HINT_KEY) || undefined;
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPE,
          hint,
          callback: (resp) => {
            if (resp.error) {
              reject(new AuthError(resp.error));
              return;
            }
            accessToken = resp.access_token;
            tokenExpiresAt = Date.now() + (Number(resp.expires_in) - 60) * 1000;
            store.set(TOKEN_KEY, JSON.stringify({ token: accessToken, expiresAt: tokenExpiresAt }));
            rememberAccount(accessToken);
            resolve(accessToken);
          },
          error_callback: (err) => reject(new AuthError(err?.type || "popup_failed_to_open")),
        });
        client.requestAccessToken({ prompt });
      })
  );
}

// Stores the account email so later silent sign-ins recognize the Google account directly.
function rememberAccount(token) {
  if (store.get(HINT_KEY)) return;
  fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", {
    headers: { Authorization: "Bearer " + token },
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d?.user?.emailAddress) store.set(HINT_KEY, d.user.emailAddress);
    })
    .catch(() => {});
}

export function signIn() {
  return requestToken("");
}

export function signOut() {
  const token = accessToken;
  accessToken = null;
  tokenExpiresAt = 0;
  cachedFileId = null;
  store.del(TOKEN_KEY);
  store.del(HINT_KEY);
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
}

async function ensureToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return accessToken;
  const silent = requestToken("none");
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new AuthError("silent_timeout")), SILENT_TIMEOUT_MS)
  );
  return Promise.race([silent, timeout]);
}

async function driveFetch(url, init = {}) {
  const token = await ensureToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: "Bearer " + token },
  });
  if (res.status === 401) {
    accessToken = null;
    tokenExpiresAt = 0;
    store.del(TOKEN_KEY);
    throw new AuthError("Oturum süresi doldu");
  }
  if (!res.ok) {
    const message =
      res.status === 403
        ? "Drive erişimi reddedildi (403). Google Drive API'nin etkin olduğunu ve izin verdiğini kontrol et."
        : "Drive isteği başarısız oldu (" + res.status + ")";
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res;
}

async function findFileId() {
  if (cachedFileId) return cachedFileId;
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: "name = '" + FILE_NAME + "' and trashed = false",
    orderBy: "createdTime",
    fields: "files(id)",
    pageSize: "1",
  });
  const res = await driveFetch(API + "?" + params);
  const data = await res.json();
  cachedFileId = data.files?.[0]?.id ?? null;
  return cachedFileId;
}

// Downloads the data from Drive. Returns null if the file is missing (or unreadable).
export async function downloadData() {
  const id = await findFileId();
  if (!id) return null;
  try {
    const res = await driveFetch(API + "/" + id + "?alt=media");
    return await res.json();
  } catch (e) {
    if (e.status === 404) {
      cachedFileId = null;
      return null;
    }
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

export async function uploadData(data) {
  const body = JSON.stringify(data);
  const id = await findFileId();
  if (id) {
    await driveFetch(UPLOAD + "/" + id + "?uploadType=media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return;
  }
  const boundary = "task" + Math.random().toString(36).slice(2);
  const metadata = JSON.stringify({ name: FILE_NAME, parents: ["appDataFolder"] });
  const multipart =
    "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + metadata +
    "\r\n--" + boundary + "\r\nContent-Type: application/json\r\n\r\n" + body +
    "\r\n--" + boundary + "--";
  const res = await driveFetch(UPLOAD + "?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { "Content-Type": "multipart/related; boundary=" + boundary },
    body: multipart,
  });
  cachedFileId = (await res.json()).id;
}
