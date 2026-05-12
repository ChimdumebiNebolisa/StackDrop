interface SortControlProps {
  value: "recent" | "relevance";
  onChange: (value: "recent" | "relevance") => void;
}

export function SortControl({ value, onChange }: SortControlProps) {
  return (
    <fieldset className="sort-fieldset">
      <legend className="sr-only">Sort</legend>
      <label>
        <input
          type="radio"
          name="sort"
          checked={value === "relevance"}
          onChange={() => onChange("relevance")}
          data-testid="sort-relevance"
        />{" "}
        Relevance
      </label>
      <label>
        <input
          type="radio"
          name="sort"
          checked={value === "recent"}
          onChange={() => onChange("recent")}
          data-testid="sort-recent"
        />{" "}
        Recent
      </label>
    </fieldset>
  );
}
