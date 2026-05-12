interface TagFilterProps {
  tags: string[];
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function TagFilter({ tags, value, onChange }: TagFilterProps) {
  return (
    <label className="field inline-field">
      <span>Tag</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const v = event.target.value;
          onChange(v === "" ? undefined : v);
        }}
        data-testid="tag-filter"
      >
        <option value="">Any</option>
        {tags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </select>
    </label>
  );
}
