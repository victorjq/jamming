// src/components/TrackList.jsx
import Track from "./Track.jsx";

export default function TrackList({ tracks, action, onAction }) {
  return (
    <div>
      {tracks?.map((t) => (
        <Track key={t.id} track={t} action={action} onAction={onAction} />
      ))}
    </div>
  );
}