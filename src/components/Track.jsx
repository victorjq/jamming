// src/components/Track.jsx
export default function Track({ track, action, onAction }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "8px 0", borderBottom: "1px solid #eee" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{track.name}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          {track.artist} • {track.album}
        </div>
      </div>
      <button onClick={() => onAction?.(track)} aria-label={action === "add" ? "Add track" : "Remove track"}>
        {action === "add" ? "+" : "−"}
      </button>
    </div>
  );
}