import { WorkshopBranch } from "./types";

export type UserRole = "admin" | "local";

export interface AppUser {
  username: string;
  password: string;
  name: string;
  role: UserRole;
  branch?: WorkshopBranch;
}

export interface SessionUser {
  username: string;
  name: string;
  role: UserRole;
  branch?: WorkshopBranch;
}

const STORAGE_KEY = "litio_session";

export const USERS: AppUser[] = [
  {
    username: "admin",
    password: "litio2026",
    name: "Administrador Litio Energy",
    role: "admin"
  },
  {
    username: "sanisidro",
    password: "litio2026",
    name: "Recepción San Isidro (Arenales)",
    role: "local",
    branch: "lince_arenales"
  },
  {
    username: "surco",
    password: "litio2026",
    name: "Recepción Surco",
    role: "local",
    branch: "surco"
  },
  {
    username: "sanborja",
    password: "litio2026",
    name: "Recepción San Borja",
    role: "local",
    branch: "san_borja"
  },
  {
    username: "lincel",
    password: "litio2026",
    name: "Recepción Lince (José Leal)",
    role: "local",
    branch: "lince_leal"
  }
];

export function login(username: string, password: string): SessionUser | null {
  const user = USERS.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  if (!user || user.password !== password) return null;

  const session: SessionUser = {
    username: user.username,
    name: user.name,
    role: user.role,
    branch: user.branch
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed.username || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAdmin(session: SessionUser | null): boolean {
  return !!session && session.role === "admin";
}

export function canViewBranch(session: SessionUser | null, branch: string): boolean {
  if (!session) return false;
  if (session.role === "admin") return true;
  return session.branch === branch;
}
