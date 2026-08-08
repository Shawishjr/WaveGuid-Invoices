export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";
  const error = params.error;

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-badge">Secure access</div>
        <div className="login-brand">
          <img src="/WAVELOGO.svg" alt="WaveGuid logo" className="brand-logo" />
        </div>
        <h2>Welcome back</h2>
        <p className="login-sub">
          Sign in to manage invoices, clients, and exports from one polished workspace.
        </p>

        <form
          action="/api/auth/login"
          method="POST"
          className="login-form"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              defaultValue="admin@waveguid.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              defaultValue="password123"
              required
            />
          </div>

          {error && <p className="error">{decodeURIComponent(error)}</p>}

          <button type="submit" className="btn btn-primary login-submit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Sign in
          </button>
        </form>

        <p className="login-footer">
          Demo: <strong>admin@waveguid.com</strong> / <strong>password123</strong>
        </p>
      </div>
    </div>
  );
}
