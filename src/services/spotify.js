// src/services/spotify.js
// Auth: Authorization Code with PKCE (no client secret in the browser)
// Requires env vars (place in project root):
//  .env (dev):
//    VITE_SPOTIFY_CLIENT_ID=eb44c2ec87f54cc68b3dd2fe64ff50a0
//    VITE_REDIRECT_URI=http://127.0.0.1:5173/
//    VITE_SCOPES=playlist-modify-public playlist-modify-private
//  .env.production (for GitHub Pages):
//    VITE_SPOTIFY_CLIENT_ID=eb44c2ec87f54cc68b3dd2fe64ff50a0
//    VITE_REDIRECT_URI=https://victorjq.github.io/jamming/
//    VITE_SCOPES=playlist-modify-public playlist-modify-private

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
const SCOPES = (import.meta.env.VITE_SCOPES || "playlist-modify-public playlist-modify-private").split(" ");

const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";

const K = {
  access: "sp_access_token",
  refresh: "sp_refresh_token",
  expiry: "sp_token_expiry",
  verifier: "sp_pkce_verifier",
};

function now() {
  return Date.now();
}

function getStored(key) {
  return localStorage.getItem(key);
}

function setStored(key, val) {
  localStorage.setItem(key, val);
}

function delStored(key) {
  localStorage.removeItem(key);
}

function hasValidAccessToken() {
  const token = getStored(K.access);
  const expiry = Number(getStored(K.expiry) || 0);
  return Boolean(token && expiry && now() < expiry);
}

function getAccessTokenFromStore() {
  if (!hasValidAccessToken()) return null;
  return getStored(K.access);
}

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
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function clearTokens() {
  delStored(K.access);
  delStored(K.refresh);
  delStored(K.expiry);
}

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
  if (!res.ok) throw new Error("Token exchange failed");
  const json = await res.json();

  const expiresAt = now() + json.expires_in * 1000 - 60000; // refresh 1 min early
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
  const expiresAt = now() + json.expires_in * 1000 - 60000;
  if (json.access_token) setStored(K.access, json.access_token);
  setStored(K.expiry, String(expiresAt));
  if (json.refresh_token) setStored(K.refresh, json.refresh_token);
  return getStored(K.access);
}

async function authorize() {
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

  // clean the URL
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

// Public API
const Spotify = {
  // Call on app load
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

  // Optional helpers you will wire next steps:
  async search(term) {
    if (!term) return [];
    const qs = new URLSearchParams({ q: term, type: "track", limit: "20" });
    const res = await fetchWithAuth(`https://api.spotify.com/v1/search?${qs.toString()}`);
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

  async savePlaylist(name, uris) {
    if (!name || !uris?.length) return;
    const me = await fetchWithAuth("https://api.spotify.com/v1/me").then((r) => r.json());
    const created = await fetchWithAuth(`https://api.spotify.com/v1/users/${me.id}/playlists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, public: false }),
    }).then((r) => r.json());
    await fetchWithAuth(`https://api.spotify.com/v1/playlists/${created.id}/tracks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris }),
    });
  },
};

export default Spotify;
