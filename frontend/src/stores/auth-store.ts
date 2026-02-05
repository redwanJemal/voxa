import { create } from "zustand";

type User = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  organization_id: string | null;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
};

type AuthState = {
  user: User | null;
  token: string | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  setOrganization: (org: Organization) => void;
  logout: () => void;
  loadFromStorage: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  organization: null,
  isAuthenticated: false,

  login: (token, user) => {
    localStorage.setItem("voxa_token", token);
    localStorage.setItem("voxa_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  setOrganization: (org) => {
    localStorage.setItem("voxa_org", JSON.stringify(org));
    set({ organization: org });
  },

  logout: () => {
    localStorage.removeItem("voxa_token");
    localStorage.removeItem("voxa_user");
    localStorage.removeItem("voxa_org");
    set({ token: null, user: null, organization: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem("voxa_token");
    const userStr = localStorage.getItem("voxa_user");
    const orgStr = localStorage.getItem("voxa_org");
    if (token && userStr) {
      set({
        token,
        user: JSON.parse(userStr),
        organization: orgStr ? JSON.parse(orgStr) : null,
        isAuthenticated: true,
      });
    }
  },
}));
