import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { isSuperAdmin, userUpdateSchema } from "@/lib/users";

type Params = { params: Promise<{ id: string }> };

async function requireAdmin(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user || !isSuperAdmin(user.role)) return null;
  return user;
}

export async function PUT(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = parsed.data;

    if (data.email && data.email !== existing.email) {
      const clash = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (clash) {
        return NextResponse.json(
          { error: "A user with that email already exists" },
          { status: 409 }
        );
      }
    }

    // Prevent locking yourself out: never strip your own super-admin role.
    if (
      id === admin.id &&
      data.role &&
      data.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        { error: "You cannot remove your own Super Admin role" },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      email?: string;
      role?: string;
      password?: string;
      phone?: string | null;
      address?: string | null;
      image?: string | null;
    } = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.address !== undefined) updateData.address = data.address || null;
    if (data.image !== undefined) updateData.image = data.image || null;
    if (data.password) {
      const { hashPassword } = await import("@/lib/auth");
      updateData.password = await hashPassword(data.password);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    if (id === admin.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const superAdminCount = await prisma.user.count({
      where: { role: "SUPER_ADMIN" },
    });
    if (existing.role === "SUPER_ADMIN" && superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last Super Admin" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
