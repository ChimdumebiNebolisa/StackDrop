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
          <Link to="/#library" className="nav-link">
            Library
          </Link>
          <Link to="/#locations" className="nav-link">
            Locations
          </Link>
          <Link to="/?parseStatus=parse_failed#library" className="nav-link">
            Failed parses
          </Link>
          <Link to="/#settings" className="nav-link">
            Settings
          </Link>
          <Link to="/#about" className="nav-link">
            About
          </Link>
        </nav>
      </aside>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
