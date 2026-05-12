import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../layout/AppShell";
import { CollectionScreen } from "../../features/collections/screens/CollectionScreen";
import { ItemDetailScreen } from "../../features/items/screens/ItemDetailScreen";
import { ItemListScreen } from "../../features/items/screens/ItemListScreen";
import { TagScreen } from "../../features/tags/screens/TagScreen";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<ItemListScreen />} />
          <Route path="/items/:id" element={<ItemDetailScreen />} />
          <Route path="/collections/:collectionId" element={<CollectionScreen />} />
          <Route path="/tags/:tagName" element={<TagScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
