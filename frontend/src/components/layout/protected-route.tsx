import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";

export function ProtectedRoute() {
  const { isAuthenticated, loadFromStorage } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    loadFromStorage();
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
