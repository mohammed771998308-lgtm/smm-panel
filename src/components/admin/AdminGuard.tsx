"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { USER_ROLES } from "@/lib/constants";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

/**
 * Wraps any page/layout that requires admin access.
 * - Shows spinner while auth is loading
 * - Redirects to /dashboard if user is not admin
 */
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Not logged in
    if (!user) {
      router.replace("/login");
      return;
    }

    // Logged in but not admin
    if (userProfile && userProfile.role !== USER_ROLES.admin) {
      router.replace("/dashboard");
    }
  }, [user, userProfile, loading, router]);

  // Still loading auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Not authorized — render nothing (redirect in progress)
  if (!user || !userProfile || userProfile.role !== USER_ROLES.admin) {
    return null;
  }

  return <>{children}</>;
}
