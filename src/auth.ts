export type UserRole = "admin" | "jefa" | "tecnico";

import { db, isFirebaseConfigured, doc, setDoc, deleteDoc, serverTimestamp } from "./firebase";

export interface LocalUser {
  name: string;
  clave: string;
}

export interface LocalAccess {
  key: string;
  name: string;
  jefa: LocalUser;
  tecnicos: LocalUser[];
}

export type AuthConfig = {
  admin: LocalUser;
  locales: LocalAccess[];
};

export interface AuthSession {
  role: UserRole;
  name: string;
  localKey?: string;
}

export interface UserEntry {
  role: UserRole;
  name: string;
  localKey?: string;
  localName?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  jefa: "Jefa de Local",
  tecnico: "Técnico"
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Acceso total a todos los locales",
  jefa: "Solo su local asignado",
  tecnico: "Solo su local asignado"
};

export const ROLE_TABS: Record<UserRole, string[]> = {
  admin: ["reception", "technician", "presupuesto", "calidad", "express", "chat", "clientes", "dashboard", "accesos"],
  jefa: ["reception", "technician", "presupuesto", "calidad", "express", "chat", "clientes"],
  tecnico: ["technician"]
};

export const LOCALES: { key: string; name: string }[] = [
  { key: "lince_arenales", name: "San Isidro (Arenales)" },
  { key: "surco", name: "Surco" },
  { key: "san_borja", name: "San Borja" },
  { key: "lince_leal", name: "Lince (José Leal)" }
];

export function defaultConfig(): AuthConfig {
  return {
    admin: { name: "", clave: "" },
    locales: LOCALES.map((l) => ({
      key: l.key,
      name: l.name,
      jefa: { name: "", clave: "" },
      tecnicos: []
    }))
  };
}

export function isValidConfig(c: any): c is AuthConfig {
  return !!(
    c &&
    c.admin &&
    typeof c.admin.name === "string" &&
    typeof c.admin.clave === "string" &&
    Array.isArray(c.locales) &&
    c.locales.length > 0 &&
    c.locales.every(
      (l: any) =>
        l &&
        typeof l.key === "string" &&
        typeof l.name === "string" &&
        l.jefa &&
        typeof l.jefa.name === "string" &&
        typeof l.jefa.clave === "string" &&
        Array.isArray(l.tecnicos)
    )
  );
}

export function sessionLabel(s: AuthSession): string {
  const base = ROLE_LABELS[s.role] || s.role;
  if (s.localKey) {
    const loc = LOCALES.find((l) => l.key === s.localKey);
    return `${base} · ${loc ? loc.name : s.localKey}`;
  }
  return base;
}

export function findUser(config: AuthConfig, name: string, clave: string): AuthSession | null {
  const cleanName = name.trim().toLowerCase();
  if (config.admin.name.trim().toLowerCase() === cleanName && config.admin.clave === clave) {
    return { role: "admin", name: config.admin.name.trim() };
  }
  for (const loc of config.locales) {
    if (loc.jefa.name.trim().toLowerCase() === cleanName && loc.jefa.clave === clave) {
      return { role: "jefa", name: loc.jefa.name.trim(), localKey: loc.key };
    }
    for (const t of loc.tecnicos) {
      if (t.name.trim().toLowerCase() === cleanName && t.clave === clave) {
        return { role: "tecnico", name: t.name.trim(), localKey: loc.key };
      }
    }
  }
  return null;
}

export function listUsers(config: AuthConfig): UserEntry[] {
  const users: UserEntry[] = [];
  if (config.admin.name.trim()) {
    users.push({ role: "admin", name: config.admin.name.trim() });
  }
  for (const loc of config.locales) {
    if (loc.jefa.name.trim()) {
      users.push({ role: "jefa", name: loc.jefa.name.trim(), localKey: loc.key, localName: loc.name });
    }
    for (const t of loc.tecnicos) {
      if (t.name.trim()) {
        users.push({ role: "tecnico", name: t.name.trim(), localKey: loc.key, localName: loc.name });
      }
    }
  }
  return users;
}

const CONFIG_KEY = "litio_tablet_auth_config";
const SESSION_KEY = "litio_tablet_auth_session";
const CONFIG_DOC = { collection: "config", doc: "accesos" };

export function loadConfig(): AuthConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveConfig(config: AuthConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Compartir la configuración de accesos en Firestore para que sea la misma en todos los dispositivos
export async function pushRemoteConfig(config: AuthConfig): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, CONFIG_DOC.collection, CONFIG_DOC.doc), {
    config,
    updatedAt: serverTimestamp()
  });
}

export async function resetRemoteConfig(): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, CONFIG_DOC.collection, CONFIG_DOC.doc));
  } catch (err) {
    console.error("Error al borrar la configuración remota:", err);
  }
}

export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed && parsed.role && ROLE_LABELS[parsed.role]) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
  localStorage.removeItem(SESSION_KEY);
}
