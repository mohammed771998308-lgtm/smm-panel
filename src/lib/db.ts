import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/constants";

// ============================================================
// Firestore Document Schemas (TypeScript Interfaces)
// ============================================================

export type DepositStatus = "pending" | "approved" | "rejected";
export type OrderStatus =
  | "pending"
  | "processing"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "partial"
  | "failed";

export interface DepositDoc {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  utr: string; // Bank UTR / UPI Transaction Reference
  status: DepositStatus;
  createdAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string; // admin UID
  notes?: string;
}

export interface OrderDoc {
  id: string;
  userId: string;
  userEmail: string;
  serviceId: string;
  serviceName: string;
  category: string;
  link: string; // Target URL (e.g. Instagram post URL)
  quantity: number;
  charge: number; // Amount charged from user balance
  providerOrderId?: string; // ID returned by the SMM provider
  providerCharge?: number; // Actual cost from provider (hidden from user)
  status: OrderStatus;
  startCount?: number;
  remains?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============================================================
// Deposit Queries
// ============================================================

/**
 * Fetch all deposits with a given status (default: pending).
 */
export async function getDeposits(
  status: DepositStatus = "pending"
): Promise<DepositDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.deposits),
    where("status", "==", status),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositDoc));
}

/**
 * Fetch all deposits for a specific user.
 */
export async function getUserDeposits(userId: string): Promise<DepositDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.deposits),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DepositDoc));
}

// ============================================================
// Approve Deposit — Atomic Batch Write
// ============================================================

/**
 * Approve a pending deposit:
 * 1. Sets deposit status → "approved"
 * 2. Increments the user's balance by the deposit amount
 * Both writes happen atomically in a single batch.
 */
export async function approveDeposit(
  deposit: DepositDoc,
  adminUid: string
): Promise<void> {
  const batch = writeBatch(db);

  // 1. Update deposit document
  const depositRef = doc(db, COLLECTIONS.deposits, deposit.id);
  batch.update(depositRef, {
    status: "approved" as DepositStatus,
    reviewedAt: Timestamp.now(),
    reviewedBy: adminUid,
  });

  // 2. Increment user balance
  const userRef = doc(db, COLLECTIONS.users, deposit.userId);
  batch.update(userRef, {
    balance: increment(deposit.amount),
  });

  await batch.commit();
}

/**
 * Reject a pending deposit.
 */
export async function rejectDeposit(
  depositId: string,
  adminUid: string,
  notes?: string
): Promise<void> {
  const batch = writeBatch(db);

  const depositRef = doc(db, COLLECTIONS.deposits, depositId);
  batch.update(depositRef, {
    status: "rejected" as DepositStatus,
    reviewedAt: Timestamp.now(),
    reviewedBy: adminUid,
    ...(notes ? { notes } : {}),
  });

  await batch.commit();
}

// ============================================================
// Order Queries
// ============================================================

/**
 * Fetch orders for a specific user, newest first.
 */
export async function getUserOrders(userId: string): Promise<OrderDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.orders),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDoc));
}

/**
 * Fetch all orders (admin).
 */
export async function getAllOrders(): Promise<OrderDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.orders),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as OrderDoc));
}

// ============================================================
// Helpers
// ============================================================

export function timestampToDate(ts: Timestamp | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    approved: "bg-green-500/10 text-green-400 border-green-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    in_progress: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
    partial: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    map[status] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"
  );
}
