'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoutButton } from "./LogoutButton";
import { startRouteLoader } from "./RouteLoader";

export default function AppShell({
  children,
  userName,
  userImage,
}: Readonly<{
  children: React.ReactNode;
  userName?: string | null;
  userImage?: string | null;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const showSidebar = pathname !== "/login";
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  const [isOpen, setIsOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("waveguid-theme") as "light" | "dark" | null;
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const nextTheme = savedTheme ?? systemTheme;
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("waveguid-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((value) => (value === "light" ? "dark" : "light"));
  }

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed) return;
    startRouteLoader();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className={`app-shell ${showSidebar ? "has-sidebar" : "no-sidebar"}`}>
      {showSidebar && (
        <aside className={`sidebar ${isOpen ? "is-open" : "is-collapsed"}`}>
          <Link href="/dashboard" className="sidebar-brand" aria-label="WaveGuid home">
            {isOpen ? (
              <img
                src={theme === "dark" ? "/LOGODARK.SVG" : "/WAVELOGO.svg"}
                alt="WaveGuid"
                className="sidebar-brand-logo"
              />
            ) : (
              <img src="/icon.svg" alt="WaveGuid" className="sidebar-brand-icon" />
            )}
          </Link>
          <nav className="sidebar-nav">
            <Link className={`sidebar-link${isActive("/dashboard") ? " is-active" : ""}`} href="/dashboard">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                </svg>
              </span>
              <span>Dashboard</span>
            </Link>
            <Link className={`sidebar-link${isActive("/clients") ? " is-active" : ""}`} href="/clients">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                  <circle cx="9.5" cy="7" r="3" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span>Clients</span>
            </Link>
            <Link className={`sidebar-link${isActive("/invoices") ? " is-active" : ""}`} href="/invoices">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </span>
              <span>All invoices</span>
            </Link>
            <Link className={`sidebar-link${isActive("/reports") ? " is-active" : ""}`} href="/reports">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="M7 15l3-4 3 2 4-6" />
                  <path d="M18 7h-3" />
                </svg>
              </span>
              <span>Reports</span>
            </Link>
            <Link className={`sidebar-link${isActive("/payments") ? " is-active" : ""}`} href="/payments">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
              </span>
              <span>Payments</span>
            </Link>
            <Link className={`sidebar-link${isActive("/templates") ? " is-active" : ""}`} href="/templates">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="16" height="18" rx="2" />
                  <line x1="8" y1="8" x2="16" y2="8" />
                  <line x1="8" y1="12" x2="14" y2="12" />
                  <line x1="8" y1="16" x2="13" y2="16" />
                </svg>
              </span>
              <span>PDF templates</span>
            </Link>
            <Link className={`sidebar-link${isActive("/currency-rate") ? " is-active" : ""}`} href="/currency-rate">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M8.5 8.5h5.5a2.5 2.5 0 0 1 0 5H9.5" />
                  <path d="M11 13.5 9.5 15.5" />
                  <path d="M11 6.5v2" />
                  <path d="M9.5 15.5h4" />
                </svg>
              </span>
              <span>Currency rate</span>
            </Link>
            <Link className="sidebar-link sidebar-link-primary" href="/invoices/new">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
              <span>New invoice</span>
            </Link>
          </nav>
          <LogoutButton />
        </aside>
      )}
      <div className="main-panel">
        {showSidebar && (
          <header className="top-bar">
            <div className="top-bar-start">
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setIsOpen((value) => !value)}
                aria-label={isOpen ? "Collapse navigation" : "Expand navigation"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>

            <form className="search-field" onSubmit={handleSearch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="6" />
                <line x1="20" y1="20" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="app-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search invoices or clients"
              />
            </form>

            <div className="top-bar-actions">
              <button type="button" className="icon-button" onClick={toggleTheme} aria-label="Toggle color theme">
                {theme === "light" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                  </svg>
                )}
              </button>

              <div className="user-menu" ref={menuRef}>
                <button
                  type="button"
                  className="user-chip"
                  onClick={() => setMenuOpen((value) => !value)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  aria-label="Open account menu"
                >
                  <div className="user-avatar">
                    {userImage ? (
                      <img
                        src={userImage}
                        alt={userName?.trim() || "Account"}
                        className="user-avatar-img"
                      />
                    ) : (
                      (userName?.trim() || "A").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="user-copy">
                    <strong>{userName?.trim() || "Admin"}</strong>
                    <span>Account</span>
                  </div>
                  <svg
                    className={`user-menu-chevron${menuOpen ? " is-open" : ""}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="user-dropdown" role="menu">
                    <Link href="/settings#profile" className="user-dropdown-item" role="menuitem">
                      <span aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <span>Profile</span>
                    </Link>
                    <Link href="/settings" className="user-dropdown-item" role="menuitem">
                      <span aria-hidden>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                      </span>
                      <span>Settings</span>
                    </Link>
                    <form action="/api/auth/logout" method="POST">
                      <button type="submit" className="user-dropdown-item user-dropdown-logout" role="menuitem">
                        <span aria-hidden>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                        </span>
                        <span>Log out</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </header>
        )}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
