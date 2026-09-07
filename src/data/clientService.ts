import { db, collection, doc, getDocs, setDoc, query, where, onSnapshot, serverTimestamp } from "../firebase";
import { isFirebaseConfigured } from "../firebase";
import type { Cliente } from "./types";
import { nextClientId } from "./idGenerator";

/**
 * Client Service — normalized client entity.
 *
 * Collection: clientes/{clientId}
 * ID format: CLI-XXXXXX (globally unique, not tied to DNI/phone)
 *
 * Duplicate detection:
 *   - By DNI (exact match)
 *   - By phone (exact match after normalization)
 *   - If both match different existing clients, returns the DNI match (DNI is authoritative)
 */

const CLIENTES_COLLECTION = "clientes";

function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").trim();
}

function cleanDni(dni: string): string {
  return dni.replace(/[^\d]/g, "").trim();
}

/**
 * Search for an existing client by DNI or phone.
 * Returns the matching Cliente or null.
 */
export async function findExistingClient(dni: string, phone: string): Promise<Cliente | null> {
  if (!isFirebaseConfigured || !db) return null;

  const cleanD = cleanDni(dni);
  const cleanP = cleanPhone(phone);

  // Search by DNI first (authoritative)
  if (cleanD) {
    const dniQuery = query(
      collection(db, CLIENTES_COLLECTION),
      where("dni", "==", cleanD)
    );
    const dniSnap = await getDocs(dniQuery);
    if (!dniSnap.empty) {
      const doc = dniSnap.docs[0];
      return { id: doc.id, ...doc.data() } as Cliente;
    }
  }

  // Search by phone
  if (cleanP) {
    const phoneQuery = query(
      collection(db, CLIENTES_COLLECTION),
      where("phone", "==", cleanP)
    );
    const phoneSnap = await getDocs(phoneQuery);
    if (!phoneSnap.empty) {
      const doc = phoneSnap.docs[0];
      return { id: doc.id, ...doc.data() } as Cliente;
    }
  }

  return null;
}

/**
 * Create or update a client. If an existing client is found by DNI or phone,
 * updates their record. Otherwise, creates a new one.
 *
 * Returns the Cliente (new or updated).
 */
export async function upsertClient(data: {
  name: string;
  phone: string;
  email: string;
  dni: string;
}): Promise<Cliente> {
  if (!isFirebaseConfigured || !db) {
    // Offline fallback
    const id = await nextClientId();
    return {
      id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      dni: data.dni,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalOrders: 1,
    };
  }

  const existing = await findExistingClient(data.dni, data.phone);

  const now = new Date().toISOString();

  if (existing) {
    // Update existing client
    const updated: Cliente = {
      ...existing,
      name: data.name || existing.name,
      phone: data.phone || existing.phone,
      email: data.email || existing.email,
      dni: data.dni || existing.dni,
      totalOrders: existing.totalOrders + 1,
      updatedAt: now,
    };
    await setDoc(doc(db, CLIENTES_COLLECTION, existing.id), updated, { merge: true });
    return updated;
  }

  // Create new client
  const id = await nextClientId();
  const newClient: Cliente = {
    id,
    name: data.name,
    phone: data.phone,
    email: data.email,
    dni: data.dni,
    createdAt: now,
    updatedAt: now,
    totalOrders: 1,
  };
  await setDoc(doc(db, CLIENTES_COLLECTION, id), newClient);
  return newClient;
}

/**
 * Update client fields (partial update).
 */
export async function updateClient(clientId: string, data: Partial<Omit<Cliente, "id" | "createdAt">>): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const updates = { ...data, updatedAt: new Date().toISOString() };
  await setDoc(doc(db, CLIENTES_COLLECTION, clientId), updates, { merge: true });
}

/**
 * Get a client by ID.
 */
export async function getClient(clientId: string): Promise<Cliente | null> {
  if (!isFirebaseConfigured || !db) return null;
  const snap = await getDocs(query(collection(db, CLIENTES_COLLECTION), where("id", "==", clientId)));
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as Cliente;
}

/**
 * Subscribe to all clients (realtime).
 */
export function subscribeClients(callback: (clients: Cliente[]) => void): () => void {
  if (!isFirebaseConfigured || !db) {
    callback([]);
    return () => {};
  }
  return onSnapshot(collection(db, CLIENTES_COLLECTION), (snap) => {
    const clients: Cliente[] = [];
    snap.forEach((d) => {
      clients.push({ id: d.id, ...d.data() } as Cliente);
    });
    callback(clients);
  });
}
