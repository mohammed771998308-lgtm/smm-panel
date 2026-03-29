"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import AdminGuard from "@/components/admin/AdminGuard";
import Toast, { useToast } from "@/components/ui/Toast";
import Button from "@/components/ui/Button";
import {
  getDeposits,
  approveDeposit,
  rejectDeposit,
  timestampToDate,
  statusBadgeClass,
  type DepositDoc,
} from "@/lib/db";
import { formatCurrency } from "@/lib/constants";

// ============================================================
// Deposits Admin Page
// ============================================================

function DepositsPageContent() {
  const { userProfile } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const [deposits, setDeposits] = useState<DepositDoc[]>([]);
  const [loadingDeposits, setLoadingDeposits] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

  // Fetch deposits for the active tab
  const fetchDeposits = useCallback(async () => {
    try {
      setLoadingDeposits(true);
      const data = await getDeposits(activeTab);
      setDeposits(data);
    } catch (err) {
      addToast("Failed to load deposits. Please try again.", "error");
      console.error(err);
    } finally {
      setLoadingDeposits(false);
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  // ---- Approve ----
  const handleApprove = async (deposit: DepositDoc) => {
    if (!userProfile?.uid) return;
    try {
      setProcessingId(deposit.id);
      await approveDeposit(deposit, userProfile.uid);
      addToast(
        `✅ Approved ${formatCurrency(deposit.amount)} for ${deposit.userEmail}`,
        "success"
      );
      // Remove from list immediately (optimistic update)
      setDeposits((prev) => prev.filter((d) => d.id !== deposit.id));
    } catch (err) {
      addToast("Failed to approve deposit. Please try again.", "error");
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // ---- Reject ----
  const handleReject = async (deposit: DepositDoc) => {
    if (!userProfile?.uid) return;
    const confirmed = window.confirm(
      `Reject deposit of ${formatCurrency(deposit.amount)} from ${deposit.userEmail}?`
    );
    if (!confirmed) return;

    try {
      setProcessingId(deposit.id);
      await rejectDeposit(deposit.id, userProfile.uid, "Rejected by admin");
      addToast(`Rejected deposit from ${deposit.userEmail}`, "info");
      setDeposits((prev) => prev.filter((d) => d.id !== deposit.id));
    } catch (err) {
      addToast("Failed to reject deposit. Please try again.", "error");
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const tabs: { key: "pending" | "approved" | "rejected"; label: string; emoji: string }[] = [
    { key: "pending", label: "Pending", emoji: "⏳" },
    { key: "approved", label: "Approved", emoji: "✅" },
    { key: "rejected", label: "Rejected", emoji: "❌" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
            Deposit Requests 🏦
          </h1>
          <p className="text-[var(--color-text-muted)] mt-1 text-sm">
            Review and approve user deposit submissions
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchDeposits}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass-card rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
              ${
                activeTab === tab.key
                  ? "bg-[var(--color-accent)] text-white shadow-md"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }
            `}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loadingDeposits ? (
        <DepositsSkeleton />
      ) : deposits.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <DepositTable
          deposits={deposits}
          activeTab={activeTab}
          processingId={processingId}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}

// ============================================================
// Deposit Table Component
// ============================================================

function DepositTable({
  deposits,
  activeTab,
  processingId,
  onApprove,
  onReject,
}: {
  deposits: DepositDoc[];
  activeTab: string;
  processingId: string | null;
  onApprove: (d: DepositDoc) => void;
  onReject: (d: DepositDoc) => void;
}) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/50">
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                User
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Amount
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                UTR / Ref
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Date
              </th>
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Status
              </th>
              {activeTab === "pending" && (
                <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {deposits.map((deposit) => (
              <tr
                key={deposit.id}
                className="hover:bg-[var(--color-bg-tertiary)]/30 transition-colors duration-150"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {deposit.userEmail[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-[var(--color-text-primary)] truncate max-w-[180px]">
                      {deposit.userEmail}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-base font-bold text-[var(--color-accent)]">
                    {formatCurrency(deposit.amount)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <code className="text-sm text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded-lg font-mono">
                    {deposit.utr}
                  </code>
                </td>
                <td className="px-6 py-4 text-sm text-[var(--color-text-muted)]">
                  {timestampToDate(deposit.createdAt)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border capitalize ${statusBadgeClass(deposit.status)}`}
                  >
                    {deposit.status}
                  </span>
                </td>
                {activeTab === "pending" && (
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={processingId === deposit.id}
                        disabled={processingId !== null}
                        onClick={() => onApprove(deposit)}
                        id={`approve-${deposit.id}`}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={processingId === deposit.id}
                        disabled={processingId !== null}
                        onClick={() => onReject(deposit)}
                        id={`reject-${deposit.id}`}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-[var(--color-border)]">
        {deposits.map((deposit) => (
          <div key={deposit.id} className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover)] flex items-center justify-center text-white text-xs font-bold">
                  {deposit.userEmail[0].toUpperCase()}
                </div>
                <span className="text-sm text-[var(--color-text-primary)] truncate max-w-[160px]">
                  {deposit.userEmail}
                </span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border capitalize ${statusBadgeClass(deposit.status)}`}>
                {deposit.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-[var(--color-accent)]">
                {formatCurrency(deposit.amount)}
              </span>
              <code className="text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-tertiary)] px-2 py-1 rounded-lg font-mono">
                {deposit.utr}
              </code>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {timestampToDate(deposit.createdAt)}
            </p>
            {activeTab === "pending" && (
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  fullWidth
                  isLoading={processingId === deposit.id}
                  disabled={processingId !== null}
                  onClick={() => onApprove(deposit)}
                >
                  ✅ Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  fullWidth
                  isLoading={processingId === deposit.id}
                  disabled={processingId !== null}
                  onClick={() => onReject(deposit)}
                >
                  ❌ Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Skeleton Loader
// ============================================================

function DepositsSkeleton() {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]/50 grid grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 rounded-lg animate-shimmer" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="p-4 border-b border-[var(--color-border)] grid grid-cols-5 gap-4 items-center"
        >
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className={`h-5 rounded-lg animate-shimmer ${j === 1 ? "w-20" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, { icon: string; text: string }> = {
    pending: { icon: "🎉", text: "No pending deposits! All caught up." },
    approved: { icon: "📭", text: "No approved deposits yet." },
    rejected: { icon: "📭", text: "No rejected deposits yet." },
  };
  const msg = messages[tab] ?? { icon: "📭", text: "No deposits found." };

  return (
    <div className="glass-card rounded-2xl p-12 text-center">
      <span className="text-5xl mb-4 block">{msg.icon}</span>
      <p className="text-[var(--color-text-muted)]">{msg.text}</p>
    </div>
  );
}

// ============================================================
// Page Export — Wrapped with AdminGuard
// ============================================================

export default function AdminDepositsPage() {
  return (
    <AdminGuard>
      <DepositsPageContent />
    </AdminGuard>
  );
}
