import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isSuperAdmin, ROLE_LABELS, type UserRole } from "@/lib/users";
import { UserManager } from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) notFound();

  const [me, users] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        image: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        image: true,
        createdAt: true,
      },
    }),
  ]);

  if (!me) notFound();

  const admin = isSuperAdmin(me.role);

  return (
    <>
      <section className="hero-copy" style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: "2.4rem",
            margin: "0 0 8px",
          }}
        >
          Settings
        </h2>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          Manage your profile and the team of users who can access this app.
        </p>
      </section>

      {/* Profile */}
      <section className="panel" style={{ marginBottom: 24 }}>
        <div className="panel-header">
          <h3>My profile</h3>
        </div>
        <div className="profile-card">
          <div className="profile-avatar">
            {me.image ? (
              <img
                src={me.image}
                alt={me.name || "Profile"}
                className="user-avatar-img"
              />
            ) : (
              (me.name?.trim() || me.email || "A").charAt(0).toUpperCase()
            )}
          </div>
          <div className="profile-info">
            <div className="profile-name">
              {me.name || "Unnamed"}
              <span
                className={`role-badge${admin ? " role-admin" : ""}`}
                style={{ marginLeft: 10 }}
              >
                {ROLE_LABELS[me.role as UserRole] || me.role}
              </span>
            </div>
            <div className="profile-email">{me.email}</div>
            <div className="profile-meta">
              {me.phone && <span>{me.phone}</span>}
              {me.address && <span style={{ whiteSpace: "pre-wrap" }}>{me.address}</span>}
              {!me.phone && !me.address && (
                <span style={{ color: "var(--muted)" }}>
                  No contact details yet — edit your profile to add them.
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* User management — super admins only */}
      {admin ? (
        <UserManager users={users} currentUserId={me.id} />
      ) : (
        <section className="panel">
          <div className="panel-header">
            <h3>User management</h3>
          </div>
          <div className="empty">
            Only Super Admins can manage users. Contact an administrator if you
            need access.
          </div>
        </section>
      )}
    </>
  );
}
