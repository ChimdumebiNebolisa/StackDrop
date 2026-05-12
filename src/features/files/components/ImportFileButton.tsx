import { useImportFile } from "../hooks/useImportFile";

export function ImportFileButton() {
  const { importFromPicker, busy, error, clearError } = useImportFile();

  return (
    <div className="card form-card">
      <h2 className="card-title">Import file</h2>
      <p className="muted">Supported: .txt, .md, .pdf</p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          clearError();
          void importFromPicker();
        }}
        disabled={busy}
        data-testid="import-file-button"
      >
        {busy ? "Working…" : "Choose file…"}
      </button>
    </div>
  );
}
