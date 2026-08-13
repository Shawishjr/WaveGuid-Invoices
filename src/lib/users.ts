import { z } from "zod";

export const USER_ROLES = ["SUPER_ADMIN", "USER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  USER: "User",
};

export function isSuperAdmin(role?: string | null): role is UserRole {
  return role === "SUPER_ADMIN";
}

export const userCreateSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    role: z.enum(USER_ROLES).default("USER"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
  })
  .required();

export const userUpdateSchema = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    email: z.string().email("Valid email is required").optional(),
    role: z.enum(USER_ROLES).optional(),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .optional()
      .or(z.literal("")),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nothing to update",
  });

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
