import TrackList from "./TrackList.jsx";

export default function Playlist({ name, onNameChange, tracks, onRemove, onSave, saving }) {
  const disableSave = saving || tracks.length === 0;

  return (
    <section>
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, width: "100%" }}
        placeholder="Playlist name"
      />
      <TrackList tracks={tracks} action="remove" onAction={onRemove} />
      <button
        onClick={onSave}
        style={{ marginTop: 12 }}
        disabled={disableSave}
        title={tracks.length === 0 ? "Add tracks to enable saving" : undefined}
      >
        {saving ? "Saving…" : "Save to Spotify"}
      </button>
    </section>
  );
}
