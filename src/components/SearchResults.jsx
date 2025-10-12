// src/components/SearchResults.jsx
import TrackList from "./TrackList.jsx";

export default function SearchResults({ tracks, onAdd }) {
  return (
    <section>
      <h2>Results</h2>
      <TrackList tracks={tracks} action="add" onAction={onAdd} />
    </section>
  );
}
