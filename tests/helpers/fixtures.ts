import request from "supertest";
import { app } from "../../src/app.js";
import { hashPassword } from "../../src/lib/token.js";
import { prisma } from "../../src/lib/prisma.js";

export async function getRoleId(name: string): Promise<string> {
  const role = await prisma.role.findUniqueOrThrow({ where: { name } });
  return role.id;
}

export async function getPermissionIds(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const perms = await prisma.permission.findMany({ where: { key: { in: keys } } });
  return perms.map((p) => p.id);
}

interface CreateUserOptions {
  name?: string;
  email: string;
  password?: string;
  roleNames?: string[];
  permissionKeys?: string[];
}

export async function createUser(opts: CreateUserOptions) {
  const password = opts.password ?? "Test1234!";
  const passwordHash = await hashPassword(password);
  const roleIds = opts.roleNames ? await Promise.all(opts.roleNames.map(getRoleId)) : [];
  const permissionIds = await getPermissionIds(opts.permissionKeys ?? []);

  const user = await prisma.user.create({
    data: {
      name: opts.name ?? "Test User",
      email: opts.email,
      passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      roles: { create: roleIds.map((roleId) => ({ roleId })) },
      directPermissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
    },
  });

  return { user, password };
}

export async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken as string;
}

// Convenience wrapper for the common case: make a user, log them in, get a
// bearer token to drive the rest of the test through the real HTTP API.
export async function createUserAndLogin(opts: CreateUserOptions) {
  const { user, password } = await createUser(opts);
  const token = await loginAs(opts.email, password);
  return { user, token };
}

export function authed(token: string) {
  return {
    get: (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
    post: (url: string, body?: unknown) =>
      request(app).post(url).set("Authorization", `Bearer ${token}`).send(body),
    patch: (url: string, body?: unknown) =>
      request(app).patch(url).set("Authorization", `Bearer ${token}`).send(body),
    put: (url: string, body?: unknown) =>
      request(app).put(url).set("Authorization", `Bearer ${token}`).send(body),
    delete: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
  };
}
