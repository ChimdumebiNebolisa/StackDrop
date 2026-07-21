import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

import type { CredentialPersistence } from "../../settings/types/openAICredentialTypes";
import type { DocumentSummary, SummaryErrorCode } from "../types/documentSummaryTypes";

export type SummaryPanelView = "checking" | "missing_key" | "ready" | "loading" | "success" | "error";

interface DocumentSummaryPanelProps {
  open: boolean;
  view: SummaryPanelView;
  summary: DocumentSummary | null;
  errorCode: SummaryErrorCode | null;
  truncated: boolean;
  persistence: CredentialPersistence | null;
  onGenerate: () => void;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function errorMessage(code: SummaryErrorCode | null): string {
  switch (code) {
    case "api_key_missing":
      return "Add an API key in Settings to generate summaries.";
    case "invalid_api_key":
      return "OpenAI rejected this API key. Replace it in Settings and try again.";
    case "permission_denied":
      return "This OpenAI project does not have access to the summary model. Check the key and project in Settings.";
    case "rate_limited":
      return "OpenAI is rate limiting this API key. Wait a moment, then try again.";
    case "timeout":
      return "The summary request timed out. Try again.";
    case "network_error":
      return "StackDrop could not reach OpenAI. Check your connection and try again.";
    case "model_unavailable":
      return "The summary model is temporarily unavailable or inaccessible for this project. Try again later.";
    case "malformed_response":
      return "OpenAI returned a summary StackDrop could not safely read. Try again.";
    case "credential_store_error":
      return "StackDrop could not access secure credential storage. Open Settings and try again.";
    case "request_in_progress":
      return "A summary request for this document is already in progress.";
    case "request_refused":
      return "OpenAI could not generate a summary for this document.";
    case "invalid_input":
      return "This document does not contain usable text for a summary.";
    default:
      return "StackDrop could not generate the summary. Try again.";
  }
}

function SummaryList({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="summary-section">
      <h3>{heading}</h3>
      <ul>
        {items.map((item, index) => (
          <li key={`${heading}-${index}`}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function DocumentSummaryPanel({
  open,
  view,
  summary,
  errorCode,
  truncated,
  persistence,
  onGenerate,
  onClose,
}: DocumentSummaryPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const loading = view === "loading";

  useEffect(() => {
    if (!open) return;
    const appRoot = document.getElementById("root");
    const previousOverflow = document.body.style.overflow;
    const previousAriaHidden = appRoot?.getAttribute("aria-hidden");
    appRoot?.setAttribute("inert", "");
    appRoot?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      appRoot?.removeAttribute("inert");
      if (previousAriaHidden === null || previousAriaHidden === undefined) appRoot?.removeAttribute("aria-hidden");
      else appRoot?.setAttribute("aria-hidden", previousAriaHidden);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!loading) onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [loading, onClose, open]);

  if (!open) return null;

  const needsSettings = errorCode === "api_key_missing" || errorCode === "invalid_api_key" || errorCode === "permission_denied" || errorCode === "credential_store_error";

  return createPortal(
    <div
      className="summary-drawer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose();
      }}
    >
      <aside
        ref={panelRef}
        className="summary-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-summary-heading"
        tabIndex={-1}
      >
        <header className="summary-drawer-header">
          <h2 id="document-summary-heading">Document summary</h2>
          <button
            ref={closeRef}
            type="button"
            className="summary-close-button"
            aria-label="Close document summary"
            aria-disabled={loading}
            onClick={() => {
              if (!loading) onClose();
            }}
          >
            Close
          </button>
        </header>

        <div className="summary-drawer-body">
          {view === "checking" ? <p aria-live="polite">Checking summary settings...</p> : null}

          {view === "missing_key" ? (
            <div className="summary-empty-state">
              <p>Add an API key in Settings to generate summaries.</p>
              <Link className="button-secondary summary-link-button" to="/#settings">
                Open Settings
              </Link>
            </div>
          ) : null}

          {view === "ready" ? (
            <div className="summary-empty-state">
              <p>Generate a structured summary from the prepared text of this document.</p>
              <button type="button" className="button-primary" onClick={onGenerate}>
                Generate summary
              </button>
            </div>
          ) : null}

          {loading ? (
            <div className="summary-loading" aria-live="polite">
              <span className="summary-spinner" aria-hidden="true" />
              <p>Generating summary...</p>
            </div>
          ) : null}

          {view === "error" ? (
            <div className="summary-error" aria-live="assertive">
              <p>{errorMessage(errorCode)}</p>
              <div className="summary-actions">
                {needsSettings ? (
                  <Link className="button-secondary summary-link-button" to="/#settings">
                    Open Settings
                  </Link>
                ) : (
                  <button type="button" className="button-primary" onClick={onGenerate}>
                    Try again
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {view === "success" && summary ? (
            <div className="summary-result" aria-live="polite">
              <section className="summary-section">
                <h3>Overview</h3>
                <p>{summary.overview}</p>
              </section>
              <SummaryList heading="Key points" items={summary.keyPoints} />
              <SummaryList heading="Important details" items={summary.importantDetails} />
              <SummaryList heading="Important dates" items={summary.importantDates} />
              <SummaryList heading="Action items" items={summary.actionItems} />
              <SummaryList heading="Uncertainties" items={summary.uncertainties} />
              <button type="button" className="button-secondary" onClick={onGenerate}>
                Generate summary
              </button>
            </div>
          ) : null}

          {truncated ? (
            <p className="summary-truncation-note">
              This summary uses a bounded sample from the beginning, middle, and end because the document exceeds 48,000 characters.
            </p>
          ) : null}
          {persistence === "session_only" ? <p className="muted small">The API key is configured for this session only.</p> : null}
        </div>
      </aside>
    </div>,
    document.body,
  );
}
