import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../layout/AppShell";
import { DocumentDetailScreen } from "../../features/documents/screens/DocumentDetailScreen";
import { DocumentLibraryScreen } from "../../features/documents/screens/DocumentLibraryScreen";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DocumentLibraryScreen />} />
          <Route path="/documents/:id" element={<DocumentDetailScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
