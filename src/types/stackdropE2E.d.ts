import type { DocumentSummary, SummaryRequest } from "../features/document-summary/types/documentSummaryTypes";
import type { DiscoveredFileDto } from "../features/folders/services/tauriFolderFs";
import type { OpenAICredentialStatus } from "../features/settings/types/openAICredentialTypes";

declare global {
  interface Window {
    __STACKDROP_E2E__?: {
      pickFolder?: () => string | null;
      defaultDocumentRoots?: () => string[];
      discoverSupportedFiles?: (rootPath: string) => DiscoveredFileDto[] | Promise<DiscoveredFileDto[]>;
      readFileUnderRoot?: (rootPath: string, absolutePath: string) => Uint8Array | number[] | null | Promise<Uint8Array | number[] | null>;
      ocrPdfTextUnderRoot?: (rootPath: string, absolutePath: string) => string;
      extractDocTextUnderRoot?: (rootPath: string, absolutePath: string) => string;
      watchFolders?: (paths: string[], onDirtyRoot: (rootPath: string) => void) => void | (() => void);
      hasOpenAIApiKey?: () => OpenAICredentialStatus | Promise<OpenAICredentialStatus>;
      saveOpenAIApiKey?: (apiKey: string) => OpenAICredentialStatus | Promise<OpenAICredentialStatus>;
      removeOpenAIApiKey?: () => OpenAICredentialStatus | Promise<OpenAICredentialStatus>;
      summarizeDocument?: (request: SummaryRequest) => DocumentSummary | Promise<DocumentSummary>;
    };
    __STACKDROP_E2E_TEST__?: {
      emitWatch: (rootPath?: string) => void;
      createTxt: (name: string, text: string) => void;
      modifyTxt: (name: string, text: string) => void;
      deleteFile: (name: string) => void;
      renameFile: (oldName: string, newName: string) => void;
      setDiscoverError: (message: string | null) => void;
      listFileNames: () => string[];
      setSummaryFailure: (code: "invalid_api_key" | "network_error" | null) => void;
    };
  }
}

export {};
