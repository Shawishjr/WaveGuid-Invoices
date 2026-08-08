'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const router = useRouter();
  const showSidebar = pathname !== "/login";
  const [isOpen, setIsOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [searchTerm, setSearchTerm] = useState("");

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
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className={`app-shell ${showSidebar ? "has-sidebar" : "no-sidebar"}`}>
      {showSidebar && (
        <aside className={`sidebar ${isOpen ? "is-open" : "is-collapsed"}`}>
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

          <Link href="/" className={`brand sidebar-brand ${isOpen ? "is-open" : "is-collapsed"}`}>
            <img
              src={isOpen ? "/WAVELOGO.svg" : "/Iconlogo.svg"}
              alt="WaveGuid logo"
              className={`brand-logo ${isOpen ? "brand-logo-full" : "brand-logo-icon"}`}
            />
            {isOpen && (
              <div className="brand-copy">
                <h1>WaveGuid</h1>
                <span>Invoices</span>
              </div>
            )}
          </Link>

          <nav className="sidebar-nav">
            <Link className="sidebar-link" href="/dashboard">
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
            <Link className="sidebar-link" href="/clients">
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
            <Link className="sidebar-link" href="/invoices">
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
            <Link className="sidebar-link" href="/reports">
              <span aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="M7 15l3-4 3 2 4-6" />
                  <path d="M18 7h-3" />
                </svg>
              </span>
              <span>Reports</span>
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
        </aside>
      )}
      <div className="main-panel">
        {showSidebar && (
          <header className="top-bar">
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

              <Link href="/settings" className="user-chip" aria-label="Open settings">
                <div className="user-avatar">A</div>
                <div className="user-copy">
                  <strong>Admin</strong>
                  <span>Settings</span>
                </div>
              </Link>
            </div>
          </header>
        )}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
