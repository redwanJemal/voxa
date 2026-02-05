import { create } from "zustand";
import { api, ApiError } from "@/lib/api";

export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  organization_id: string | null;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
};

type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  loadFromStorage: () => void;
  fetchMe: () => Promise<void>;
  clearError: () => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setAuth: (token, user) => {
    localStorage.setItem("voxa_token", token);
    localStorage.setItem("voxa_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true, error: null });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<TokenResponse>("/auth/login", {
        email,
        password,
      });
      get().setAuth(data.access_token, data.user);
      localStorage.setItem("voxa_refresh", data.refresh_token);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Login failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.post<TokenResponse>("/auth/register", {
        name,
        email,
        password,
      });
      get().setAuth(data.access_token, data.user);
      localStorage.setItem("voxa_refresh", data.refresh_token);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Registration failed";
      set({ error: message });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("voxa_token");
    localStorage.removeItem("voxa_user");
    localStorage.removeItem("voxa_refresh");
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem("voxa_token");
    const userStr = localStorage.getItem("voxa_user");
    if (token && userStr) {
      try {
        set({
          token,
          user: JSON.parse(userStr),
          isAuthenticated: true,
        });
      } catch {
        localStorage.removeItem("voxa_token");
        localStorage.removeItem("voxa_user");
      }
    }
  },

  fetchMe: async () => {
    try {
      const user = await api.get<User>("/auth/me");
      localStorage.setItem("voxa_user", JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },

  clearError: () => set({ error: null }),
}));
