import type { ItemRecord } from "../../../domain/items/types";

interface TypeFilterProps {
  value?: ItemRecord["type"];
  onChange: (value: ItemRecord["type"] | undefined) => void;
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  return (
    <label className="field inline-field">
      <span>Type</span>
      <select
        value={value ?? ""}
        onChange={(event) => {
          const v = event.target.value;
          onChange(v === "" ? undefined : (v as ItemRecord["type"]));
        }}
        data-testid="type-filter"
      >
        <option value="">All</option>
        <option value="note">Note</option>
        <option value="link">Link</option>
        <option value="file">File</option>
      </select>
    </label>
  );
}
