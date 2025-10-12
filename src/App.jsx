import { useState } from "react";
import SearchBar from "./components/SearchBar.jsx";
import SearchResults from "./components/SearchResults.jsx";
import Playlist from "./components/Playlist.jsx";

export default function App() {
  // Mock search results
  const [results] = useState([
    { id: "1", name: "Lose Yourself", artist: "Eminem", album: "8 Mile", uri: "spotify:track:1" },
    { id: "2", name: "Numb", artist: "Linkin Park", album: "Meteora", uri: "spotify:track:2" },
    { id: "3", name: "HUMBLE.", artist: "Kendrick Lamar", album: "DAMN.", uri: "spotify:track:3" },
  ]);

  // Playlist state
  const [playlistName, setPlaylistName] = useState("New Playlist");
  const [playlistTracks, setPlaylistTracks] = useState([]);

  // Add from results (no duplicates)
  const addTrack = (track) => {
    setPlaylistTracks((prev) => (prev.some((t) => t.id === track.id) ? prev : [...prev, track]));
  };

  // Remove from playlist
  const removeTrack = (track) => {
    setPlaylistTracks((prev) => prev.filter((t) => t.id !== track.id));
  };

  // STEP 9: Save (mock) + reset
  const savePlaylist = () => {
    const uris = playlistTracks.map((t) => t.uri);
    console.log("Saving to Spotify (mock):", { name: playlistName, trackUris: uris });
    alert(`Saved "${playlistName}" with ${uris.length} tracks (mock)`);

    // Reset after "save"
    setPlaylistName("New Playlist");
    setPlaylistTracks([]);
  };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <SearchBar onSearch={(t) => console.log("Search", t)} />
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
