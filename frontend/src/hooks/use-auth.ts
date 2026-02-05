import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    store.loadFromStorage();
  }, []);

  return {
    user: store.user,
    token: store.token,
    organization: store.organization,
    isAuthenticated: store.isAuthenticated,
    login: store.login,
    logout: store.logout,
  };
}
