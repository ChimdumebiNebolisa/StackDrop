import { Link, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="layout-root">
      <aside className="layout-sidebar" aria-label="Navigation">
        <div className="brand">StackDrop</div>
        <nav className="nav-block">
          <Link to="/" className="nav-link">
            Library
          </Link>
        </nav>
      </aside>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
