import { useState } from "react";

export default function SearchBar({ onSearch }) {
  const [term, setTerm] = useState("");
  const submit = (e) => {
    e.preventDefault();
    onSearch?.(term.trim());
  };
  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search songs or artists"
        style={{ flex: 1, padding: 8 }}
      />
      <button type="submit">Search</button>
    </form>
  );
}
