import { AppDataProvider } from "../providers/AppDataProvider";
import { AppRoutes } from "../routes/AppRoutes";

export function App() {
  return (
    <AppDataProvider>
      <AppRoutes />
    </AppDataProvider>
  );
}
