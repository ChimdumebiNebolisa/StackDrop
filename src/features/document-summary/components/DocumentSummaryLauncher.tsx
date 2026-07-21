import { useCallback, useRef, useState } from "react";

import {
  getOpenAICredentialErrorCode,
  hasOpenAIApiKey,
} from "../../settings/services/openAICredentialService";
import type { CredentialPersistence } from "../../settings/types/openAICredentialTypes";
import { getSummaryErrorCode, summarizeDocument } from "../services/documentSummaryService";
import { prepareDocumentText } from "../services/prepareDocumentText";
import type { DocumentSummary, PreparedDocumentText, SummaryErrorCode, SummarySourceDocument } from "../types/documentSummaryTypes";
import { DocumentSummaryPanel, type SummaryPanelView } from "./DocumentSummaryPanel";

interface DocumentSummaryLauncherProps {
  document: SummarySourceDocument;
}

export function DocumentSummaryLauncher({ document }: DocumentSummaryLauncherProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const requestInFlightRef = useRef(false);
  const credentialCheckRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<SummaryPanelView>("checking");
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [prepared, setPrepared] = useState<PreparedDocumentText | null>(null);
  const [errorCode, setErrorCode] = useState<SummaryErrorCode | null>(null);
  const [persistence, setPersistence] = useState<CredentialPersistence | null>(null);

  const loading = view === "loading";
  const unavailable = document.parseStatus === "parse_failed" || !document.extractedText?.trim();

  const openPanel = useCallback(() => {
    if (unavailable || requestInFlightRef.current) return;
    const checkId = ++credentialCheckRef.current;
    setOpen(true);
    setView("checking");
    setSummary(null);
    setPrepared(null);
    setErrorCode(null);
    void hasOpenAIApiKey()
      .then((status) => {
        if (credentialCheckRef.current !== checkId) return;
        setPersistence(status.persistence);
        setView(status.configured ? "ready" : "missing_key");
      })
      .catch((error: unknown) => {
        if (credentialCheckRef.current !== checkId) return;
        const code = getOpenAICredentialErrorCode(error);
        setErrorCode(code === "credential_store_error" ? "credential_store_error" : "unknown");
        setView("error");
      });
  }, [unavailable]);

  const generate = useCallback(async () => {
    if (requestInFlightRef.current || !document.extractedText) return;
    requestInFlightRef.current = true;
    setSummary(null);
    setErrorCode(null);
    try {
      const nextPrepared = prepareDocumentText(document.extractedText);
      setPrepared(nextPrepared);
      setView("loading");
      const nextSummary = await summarizeDocument({
        documentId: document.id,
        fileName: document.fileName,
        relativePath: document.relativePath,
        fileExtension: document.fileExtension,
        preparedText: nextPrepared.text,
      });
      setSummary(nextSummary);
      setView("success");
    } catch (error) {
      setErrorCode(getSummaryErrorCode(error));
      setView("error");
    } finally {
      requestInFlightRef.current = false;
    }
  }, [document]);

  const closePanel = useCallback(() => {
    if (requestInFlightRef.current) return;
    credentialCheckRef.current += 1;
    setOpen(false);
    setSummary(null);
    setPrepared(null);
    setErrorCode(null);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  return (
    <>
      <button ref={triggerRef} type="button" className="button-primary" disabled={unavailable || loading} onClick={openPanel}>
        Summarize
      </button>
      <DocumentSummaryPanel
        open={open}
        view={view}
        summary={summary}
        errorCode={errorCode}
        truncated={prepared?.truncated === true}
        persistence={persistence}
        onGenerate={() => void generate()}
        onClose={closePanel}
      />
    </>
  );
}
