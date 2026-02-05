import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { Loader2 } from "lucide-react";

export function ProtectedRoute() {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    const token = localStorage.getItem("voxa_token");
    const userStr = localStorage.getItem("voxa_user");

    if (!token || !userStr) {
      setStatus("unauthenticated");
      return;
    }

    // Token exists — load into store and validate with backend
    try {
      const user = JSON.parse(userStr);
      useAuthStore.getState().setAuth(token, user);

      // Validate token is still valid by calling /auth/me
      useAuthStore.getState().fetchMe().then(() => {
        setStatus("authenticated");
      }).catch(() => {
        useAuthStore.getState().logout();
        setStatus("unauthenticated");
      });
    } catch {
      localStorage.removeItem("voxa_token");
      localStorage.removeItem("voxa_user");
      setStatus("unauthenticated");
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
