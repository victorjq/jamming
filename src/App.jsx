import { useEffect, useState } from "react";
import SearchBar from "./components/SearchBar.jsx";
import SearchResults from "./components/SearchResults.jsx";
import Playlist from "./components/Playlist.jsx";
import Spotify from "./services/spotify.js";

export default function App() {
  const [authed, setAuthed] = useState(false);

  // search UI
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  // playlist UI
  const [playlistName, setPlaylistName] = useState("New Playlist");
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    (async () => {
      await Spotify.init();
      setAuthed(await Spotify.isAuthed());
    })();
  }, []);

  const handleSearch = async (term) => {
    if (!term) return false;
    setSearchError("");
    setSearchLoading(true);
    try {
      const hasToken = await Spotify.isAuthed();
      if (!hasToken) {
        Spotify.authorize(); // redirects
        return false;
      }
      const found = await Spotify.search(term);
      setResults(found);
      return true; // tell SearchBar it succeeded so it can clear input
    } catch (e) {
      console.error(e);
      setSearchError("Search failed. Please try again.");
      return false;
    } finally {
      setSearchLoading(false);
    }
  };

  const addTrack = (track) =>
    setPlaylistTracks((prev) =>
      prev.some((t) => t.id === track.id) ? prev : [...prev, track]
    );

  const removeTrack = (track) =>
    setPlaylistTracks((prev) => prev.filter((t) => t.id !== track.id));

  const savePlaylist = async () => {
    setSaveError("");
    const uris = playlistTracks.map((t) => t.uri);
    if (!uris.length) return; // button will be disabled anyway
    try {
      setSaving(true);
      const hasToken = await Spotify.isAuthed();
      if (!hasToken) {
        Spotify.authorize();
        return;
      }
      await Spotify.savePlaylist(playlistName, uris);
      alert(`Saved "${playlistName}" with ${uris.length} tracks.`);
      setPlaylistName("New Playlist");
      setPlaylistTracks([]);
    } catch (e) {
      console.error(e);
      setSaveError("Could not save playlist. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Jammming</h1>
        {!authed ? (
          <button onClick={() => Spotify.authorize()}>Log in with Spotify</button>
        ) : (
          <span>Connected</span>
        )}
      </header>

      {/* tiny status/errors */}
      {searchLoading && (
        <div style={{ margin: "8px 0", fontSize: 14 }}>Searching…</div>
      )}
      {searchError && (
        <div style={{ margin: "8px 0", color: "#b00020", fontSize: 14 }}>{searchError}</div>
      )}
      {saveError && (
        <div style={{ margin: "8px 0", color: "#b00020", fontSize: 14 }}>{saveError}</div>
      )}

      <SearchBar onSearch={handleSearch} loading={searchLoading} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <SearchResults tracks={results} onAdd={addTrack} />
        <Playlist
          name={playlistName}
          onNameChange={setPlaylistName}
          tracks={playlistTracks}
          onRemove={removeTrack}
          onSave={savePlaylist}
          saving={saving}
        />
      </div>
    </main>
  );
}
