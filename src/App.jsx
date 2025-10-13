// src/App.jsx
import { useEffect, useState } from "react";
import SearchBar from "./components/SearchBar.jsx";
import SearchResults from "./components/SearchResults.jsx";
import Playlist from "./components/Playlist.jsx";
import Spotify from "./services/spotify.js";

export default function App() {
  // UI state
  const [authed, setAuthed] = useState(false);
  const [results, setResults] = useState([
    // mock results before real search
    { id: "1", name: "Lose Yourself", artist: "Eminem", album: "8 Mile", uri: "spotify:track:1" },
    { id: "2", name: "Numb", artist: "Linkin Park", album: "Meteora", uri: "spotify:track:2" },
    { id: "3", name: "HUMBLE.", artist: "Kendrick Lamar", album: "DAMN.", uri: "spotify:track:3" },
  ]);
  const [playlistName, setPlaylistName] = useState("New Playlist");
  const [playlistTracks, setPlaylistTracks] = useState([]);

  // Handle auth callback and token refresh on load
  useEffect(() => {
    (async () => {
      await Spotify.init();                 // store tokens if returning from Spotify
      setAuthed(await Spotify.isAuthed());  // true if token is valid or refreshable
    })();
  }, []);

  // Search handler
  const handleSearch = async (term) => {
    if (!term) return;
    const hasToken = await Spotify.isAuthed();
    if (!hasToken) return Spotify.authorize();
    const found = await Spotify.search(term);
    setResults(found);
  };

  // Add from results
  const addTrack = (track) => {
    setPlaylistTracks((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  };

  // Remove from playlist
  const removeTrack = (track) => {
    setPlaylistTracks((prev) => prev.filter((t) => t.id !== track.id));
  };

  // Save to Spotify then reset
  const savePlaylist = async () => {
    const uris = playlistTracks.map((t) => t.uri);
    if (!uris.length) return alert("Add at least one track.");
    const hasToken = await Spotify.isAuthed();
    if (!hasToken) return Spotify.authorize();
    await Spotify.savePlaylist(playlistName, uris);
    alert(`Saved "${playlistName}" with ${uris.length} tracks.`);
    setPlaylistName("New Playlist");
    setPlaylistTracks([]);
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

      <SearchBar onSearch={handleSearch} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <SearchResults tracks={results} onAdd={addTrack} />
        <Playlist
          name={playlistName}
          onNameChange={setPlaylistName}
          tracks={playlistTracks}
          onRemove={removeTrack}
          onSave={savePlaylist}
        />
      </div>
    </main>
  );
}
