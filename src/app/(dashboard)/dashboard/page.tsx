"use client";

import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/constants";

export default function DashboardPage() {
  const { userProfile } = useAuth();

  const stats = [
    {
      label: "Balance",
      value: formatCurrency(userProfile?.balance ?? 0),
      icon: "💰",
      gradient: "from-blue-500/10 to-cyan-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Total Orders",
      value: "0",
      icon: "📦",
      gradient: "from-purple-500/10 to-pink-500/10",
      border: "border-purple-500/20",
    },
    {
      label: "Total Spent",
      value: formatCurrency(0),
      icon: "💸",
      gradient: "from-orange-500/10 to-yellow-500/10",
      border: "border-orange-500/20",
    },
    {
      label: "Active Orders",
      value: "0",
      icon: "⚡",
      gradient: "from-emerald-500/10 to-teal-500/10",
      border: "border-emerald-500/20",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-[var(--color-text-primary)]">
          Welcome back{userProfile?.displayName ? `, ${userProfile.displayName.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Here&apos;s an overview of your account
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`
              glass-card p-5 rounded-2xl bg-gradient-to-br ${stat.gradient}
              border ${stat.border} hover:scale-[1.02] transition-transform duration-200
            `}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {stat.value}
            </p>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "New Order", href: "/dashboard/new-order", icon: "🛒", desc: "Place a new order" },
            { label: "Add Funds", href: "/dashboard/add-funds", icon: "💰", desc: "Top up your balance" },
            { label: "View Services", href: "/dashboard/services", icon: "📋", desc: "Browse all services" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="glass-card p-5 rounded-2xl flex items-center gap-4 hover:bg-[var(--color-bg-tertiary)] hover:scale-[1.02] transition-all duration-200 group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">
                {action.icon}
              </span>
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {action.label}
                </p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {action.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Recent Orders
        </h2>
        <div className="glass-card rounded-2xl p-8 text-center">
          <span className="text-4xl mb-3 block">📭</span>
          <p className="text-[var(--color-text-muted)]">
            No orders yet. Start by placing your first order!
          </p>
        </div>
      </div>
    </div>
  );
}
