import TrackList from "./TrackList.jsx";

export default function Playlist({ name, onNameChange, tracks, onRemove, onSave }) {
  return (
    <section>
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, width: "100%" }}
      />
      <TrackList tracks={tracks} action="remove" onAction={onRemove} />
      <button onClick={onSave} style={{ marginTop: 12 }}>Save to Spotify</button>
    </section>
  );
}
