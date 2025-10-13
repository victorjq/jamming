// src/services/spotify.js
// Authorization Code with PKCE (frontend-only; no client secret)

// ---- ENV (with safe fallbacks for prod) ----
const CLIENT_ID =
  import.meta.env.VITE_SPOTIFY_CLIENT_ID ||
  "eb44c2ec87f54cc68b3dd2fe64ff50a0";

const REDIRECT_URI =
  import.meta.env.VITE_REDIRECT_URI ||
  "https://victorjq.github.io/jamming/";

const SCOPES = (
  import.meta.env.VITE_SCOPES ||
  "playlist-modify-public playlist-modify-private"
).split(" ");

// Debug prints (shows in browser console)
console.log("[spotify.js] CLIENT_ID:", CLIENT_ID);
console.log("[spotify.js] REDIRECT_URI:", REDIRECT_URI);
console.log("[spotify.js] SCOPES:", SCOPES.join(" "));

// ---- Constants ----
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

const K = {
  access: "sp_access_token",
  refresh: "sp_refresh_token",
  expiry: "sp_token_expiry",
  verifier: "sp_pkce_verifier",
};

// ---- Storage helpers ----
const now = () => Date.now();
const getStored = (k) => localStorage.getItem(k);
const setStored = (k, v) => localStorage.setItem(k, v);
const delStored = (k) => localStorage.removeItem(k);

function hasValidAccessToken() {
  const token = getStored(K.access);
  const expiry = Number(getStored(K.expiry) || 0);
  return Boolean(token && expiry && now() < expiry);
}

function getAccessTokenFromStore() {
  if (!hasValidAccessToken()) return null;
  return getStored(K.access);
}

function clearTokens() {
  delStored(K.access);
  delStored(K.refresh);
  delStored(K.expiry);
}

// ---- PKCE helpers ----
async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function base64UrlEncode(bytes) {
  let str = "";
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createCodeChallenge(verifier) {
  const hashed = await sha256(verifier);
  return base64UrlEncode(hashed);
}

function randomVerifier(length = 64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

// ---- Token exchange / refresh ----
async function exchangeCodeForTokens(code, verifier) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error("Token exchange failed: " + txt);
  }

  const json = await res.json();
  const expiresAt = now() + json.expires_in * 1000 - 60_000; // refresh 1 min early
  setStored(K.access, json.access_token);
  setStored(K.expiry, String(expiresAt));
  if (json.refresh_token) setStored(K.refresh, json.refresh_token);
}

async function refreshAccessToken() {
  const refresh = getStored(K.refresh);
  if (!refresh) return null;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refresh,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const json = await res.json();
  const expiresAt = now() + json.expires_in * 1000 - 60_000;
  if (json.access_token) setStored(K.access, json.access_token);
  setStored(K.expiry, String(expiresAt));
  if (json.refresh_token) setStored(K.refresh, json.refresh_token);
  return getStored(K.access);
}

// ---- Public actions ----
async function authorize() {
  if (!CLIENT_ID) {
    alert("Missing CLIENT_ID. Check your env vars or fallback.");
    return;
  }
  const verifier = randomVerifier();
  const challenge = await createCodeChallenge(verifier);
  setStored(K.verifier, verifier);

  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", Math.random().toString(36).slice(2));

  // Debug before redirect
  console.log("[spotify.js] Authorize URL:", url.toString());
  window.location.assign(url.toString());
}

async function handleRedirectCallback() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error) throw new Error("Spotify auth error: " + error);
  if (!code) return false;

  const verifier = getStored(K.verifier);
  delStored(K.verifier);
  await exchangeCodeForTokens(code, verifier);

  // Clean the URL (remove code/state/error)
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  window.history.replaceState({}, document.title, url.pathname + url.search);
  return true;
}

async function getAccessToken() {
  const cached = getAccessTokenFromStore();
  if (cached) return cached;
  const refreshed = await refreshAccessToken();
  if (refreshed) return refreshed;
  return null;
}

// Authenticated fetch helper
async function fetchWithAuth(input, init = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error("No Spotify access token. Call Spotify.authorize().");
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// ---- Exported API ----
const Spotify = {
  // Call this once on app start (e.g., in App.jsx useEffect)
  async init() {
    try {
      await handleRedirectCallback();
    } catch (e) {
      console.error(e);
      clearTokens();
    }
  },

  async isAuthed() {
    if (hasValidAccessToken()) return true;
    const refreshed = await refreshAccessToken();
    return Boolean(refreshed);
  },

  authorize,
  getAccessToken,

  // Search tracks
  async search(term) {
    if (!term) return [];
    const qs = new URLSearchParams({ q: term, type: "track", limit: "20" });
    const res = await fetchWithAuth(
      `https://api.spotify.com/v1/search?${qs.toString()}`
    );
    const json = await res.json();
    const items = json?.tracks?.items || [];
    return items.map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artists?.map((a) => a.name).join(", ") || "",
      album: t.album?.name || "",
      uri: t.uri,
    }));
  },

  // Create playlist and add tracks
  async savePlaylist(name, uris) {
    if (!name || !uris?.length) return;
    // 1) current user
    const me = await fetchWithAuth("https://api.spotify.com/v1/me").then((r) =>
      r.json()
    );
    // 2) create playlist
    const created = await fetchWithAuth(
      `https://api.spotify.com/v1/users/${me.id}/playlists`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, public: false }),
      }
    ).then((r) => r.json());
    // 3) add tracks
    await fetchWithAuth(
      `https://api.spotify.com/v1/playlists/${created.id}/tracks`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris }),
      }
    );
  },
};

export default Spotify;
