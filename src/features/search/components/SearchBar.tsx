interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <label className="field inline-field">
      <span className="sr-only">Search</span>
      <input
        type="search"
        placeholder="Search indexed content…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-testid="search-input"
      />
    </label>
  );
}
