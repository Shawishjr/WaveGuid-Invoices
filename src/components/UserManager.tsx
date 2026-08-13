"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/lib/users";
import { fileToAvatarDataUrl } from "@/lib/image";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  image: string | null;
  createdAt: string | Date;
};

type Props = {
  users: User[];
  currentUserId: string;
};

type FormShape = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  phone: string;
  address: string;
  image: string;
};

const emptyForm: FormShape = {
  name: "",
  email: "",
  role: "USER",
  password: "",
  phone: "",
  address: "",
  image: "",
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Avatar({
  name,
  image,
  size = 36,
}: {
  name: string | null;
  image?: string | null;
  size?: number;
}) {
  const initial = (name?.trim() || "A").charAt(0).toUpperCase();
  return (
    <div className="user-avatar" style={{ width: size, height: size, flexShrink: 0 }}>
      {image ? (
        <img src={image} alt={name || "User"} className="user-avatar-img" />
      ) : (
        initial
      )}
    </div>
  );
}

export function UserManager({ users, currentUserId }: Props) {
  const router = useRouter();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [addForm, setAddForm] = useState<FormShape>(emptyForm);
  const [editForm, setEditForm] = useState<FormShape>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setAddForm(emptyForm);
    setError(null);
    setAddOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    setEditForm({
      name: user.name || "",
      email: user.email,
      role: (USER_ROLES as readonly string[]).includes(user.role)
        ? (user.role as UserRole)
        : "USER",
      password: "",
      phone: user.phone || "",
      address: user.address || "",
      image: user.image || "",
    });
    setError(null);
  }

  async function handleImagePick(
    file: File | undefined,
    apply: (next: string) => void
  ) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      apply(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process image.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAddSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          phone: addForm.phone || null,
          address: addForm.address || null,
          image: addForm.image || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Unable to add user. Check the form."
        );
        setSaving(false);
        return;
      }
      setAddOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        phone: editForm.phone || null,
        address: editForm.address || null,
        image: editForm.image || null,
      };
      if (editForm.password) payload.password = editForm.password;

      const res = await fetch(`/api/users/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Unable to update user."
        );
        setSaving(false);
        return;
      }
      setEditing(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete(user: User) {
    if (!window.confirm(`Delete user "${user.name || user.email}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to delete user.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    }
  }

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <h3>Users ({users.length})</h3>
          <button className="btn btn-primary" type="button" onClick={openAdd}>
            + Add user
          </button>
        </div>

        <div className="table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th style={{ width: 160 }}>Role</th>
                <th style={{ width: 150 }}>Created</th>
                <th style={{ width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <Avatar name={user.name} image={user.image} />
                        <span>
                          <strong>{user.name || "—"}</strong>
                          {isSelf && <span className="you-tag"> (you)</span>}
                        </span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || "—"}</td>
                    <td>
                      <span
                        className={`role-badge${
                          user.role === "SUPER_ADMIN" ? " role-admin" : ""
                        }`}
                      >
                        {ROLE_LABELS[user.role as UserRole] || user.role}
                      </span>
                    </td>
                    <td>{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(user)}
                          disabled={isSelf}
                          title={isSelf ? "You cannot delete your own account" : "Delete"}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {error && (
        <div className="client-toast" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add user modal */}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Add user</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  Create a new account and assign its role.
                </p>
              </div>
              <button className="btn btn-ghost" type="button" onClick={() => setAddOpen(false)}>
                Close
              </button>
            </div>
            <form className="form-page" onSubmit={handleAddSubmit}>
              <UserFormFields
                form={addForm}
                onChange={setAddForm}
                isNew
                uploading={uploading}
                onImagePick={(file) =>
                  handleImagePick(file, (url) =>
                    setAddForm((f) => ({ ...f, image: url }))
                  )
                }
                onImageRemove={() =>
                  setAddForm((f) => ({ ...f, image: "" }))
                }
              />
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn btn-ghost" type="button" onClick={() => setAddOpen(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving || uploading}>
                  {saving ? "Saving…" : "Add user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Edit user</h3>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                  Update {editing.name || editing.email}. Leave password blank to keep it.
                </p>
              </div>
              <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
                Close
              </button>
            </div>
            <form className="form-page" onSubmit={handleEditSubmit}>
              <UserFormFields
                form={editForm}
                onChange={setEditForm}
                isNew={false}
                uploading={uploading}
                onImagePick={(file) =>
                  handleImagePick(file, (url) =>
                    setEditForm((f) => ({ ...f, image: url }))
                  )
                }
                onImageRemove={() =>
                  setEditForm((f) => ({ ...f, image: "" }))
                }
              />
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={saving || uploading}>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function UserFormFields({
  form,
  onChange,
  isNew,
  uploading,
  onImagePick,
  onImageRemove,
}: {
  form: FormShape;
  onChange: (next: FormShape) => void;
  isNew: boolean;
  uploading: boolean;
  onImagePick: (file: File | undefined) => void;
  onImageRemove: () => void;
}) {
  function set<T extends keyof FormShape>(field: T, value: FormShape[T]) {
    onChange({ ...form, [field]: value });
  }
  return (
    <div className="form-grid">
      <div className="field full">
        <label>Profile picture</label>
        <div className="avatar-upload">
          <Avatar name={form.name || null} image={form.image} size={56} />
          <div className="avatar-upload-actions">
            <label className="btn btn-secondary btn-sm">
              {uploading ? "Processing…" : form.image ? "Change photo" : "Upload photo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => onImagePick(e.target.files?.[0])}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
            {form.image && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onImageRemove}
                disabled={uploading}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="field">
        <label>Name</label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          required
        />
      </div>
      <div className="field">
        <label>Phone</label>
        <input
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
          placeholder="Optional"
        />
      </div>
      <div className="field">
        <label>Role</label>
        <select
          value={form.role}
          onChange={(e) => set("role", e.target.value as UserRole)}
        >
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>{isNew ? "Password" : "New password"}</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          placeholder={isNew ? "Min. 6 characters" : "Leave blank to keep current"}
          minLength={6}
          required={isNew}
        />
      </div>
      <div className="field full">
        <label>Address</label>
        <textarea
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Optional"
          style={{ minHeight: 80 }}
        />
      </div>
    </div>
  );
}
