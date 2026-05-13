import { Link, Outlet } from "react-router-dom";
import stackdropLogo from "../../assets/stackdrop-logo.png";

export function AppShell() {
  return (
    <div className="layout-root">
      <aside className="layout-sidebar" aria-label="Navigation">
        <div className="brand">
          <img src={stackdropLogo} alt="StackDrop logo" className="brand-logo" />
          <div>
            <div className="brand-name">StackDrop</div>
            <p className="brand-tagline">Local document indexing &amp; search</p>
          </div>
        </div>
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
