import { db, doc, getDoc, setDoc, increment, runTransaction, serverTimestamp } from "../firebase";
import { isFirebaseConfigured } from "../firebase";
import type { AssetPrefix } from "./types";

/**
 * Atomic counter-based ID generator.
 * Uses Firestore transactions to prevent duplicates even under concurrency.
 *
 * Format: {PREFIX}-{zero-padded number}
 *   - Clients:  CLI-000001
 *   - Assets:   SCO-000847, MOT-000214, BIC-000391, BAT-001052, CAR-000678, EQP-000145
 *   - Orders:   SI-000001, SB-000003, SU-000012, LI-000005
 */

const COUNTER_COLLECTION = "counters";

const BRANCH_ORDER_PREFIX: Record<string, string> = {
  lince_arenales: "SI",
  san_borja: "SB",
  surco: "SU",
  lince_leal: "LI",
};

function padZero(n: number, size: number): string {
  return String(n).padStart(size, "0");
}

/**
 * Generate next sequential ID for a given entity type.
 * Uses an atomic Firestore transaction to increment the counter.
 */
async function nextId(prefix: string, padSize: number, minSeq = 0): Promise<string> {
  if (!isFirebaseConfigured || !db) {
    // Fallback: random ID (shouldn't happen in production)
    return `${prefix}-${padZero(Math.floor(Math.random() * 999999), padSize)}`;
  }

  const counterRef = doc(db, COUNTER_COLLECTION, prefix);

  const newCount = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef);
    const current = snap.exists() && typeof snap.data()?.count === "number"
      ? snap.data()!.count
      : 0;
    const next = Math.max(current, minSeq) + 1;
    transaction.set(counterRef, { count: next, lastUpdated: new Date().toISOString() }, { merge: true });
    return next;
  });

  return `${prefix}-${padZero(newCount, padSize)}`;
}

/** Next client ID: CLI-XXXXXX */
export async function nextClientId(): Promise<string> {
  return nextId("CLI", 6);
}

/** Next asset ID based on vehicle type: SCO-XXXXXX, MOT-XXXXXX, etc. */
export async function nextAssetId(assetPrefix: AssetPrefix): Promise<string> {
  return nextId(assetPrefix, 6);
}

/** Next order ID for a branch: SI-000001, SB-000003, SU-000012, LI-000005 */
export async function nextOrderId(branchKey: string, minSeq = 0): Promise<string> {
  const prefix = BRANCH_ORDER_PREFIX[branchKey] || "LT";
  return nextId(prefix, 6, minSeq);
}

/** Generate a client ID without writing to Firestore (for client-side only) */
export function generateClientIdLocal(): string {
  return `CLI-${padZero(Date.now() % 1000000, 6)}`;
}
