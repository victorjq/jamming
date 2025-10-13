import { useState } from "react";

export default function SearchBar({ onSearch, loading }) {
  const [term, setTerm] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const ok = await onSearch?.(term.trim());
    if (ok) setTerm(""); // clear after successful search
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search songs or artists"
        style={{ flex: 1, padding: 8 }}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !term.trim()}>
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}
