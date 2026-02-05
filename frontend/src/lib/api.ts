const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("voxa_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearAuth() {
  localStorage.removeItem("voxa_token");
  localStorage.removeItem("voxa_user");
  localStorage.removeItem("voxa_refresh");
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem("voxa_refresh");
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem("voxa_token", data.access_token);
    localStorage.setItem("voxa_refresh", data.refresh_token);
    if (data.user) {
      localStorage.setItem("voxa_user", JSON.stringify(data.user));
    }
    return true;
  } catch {
    return false;
  }
}

function redirectToLogin() {
  clearAuth();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuthRetry?: boolean;
};

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, skipAuthRetry = false } = options;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 — try refresh, then retry once
  if (response.status === 401 && !skipAuthRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request<T>(endpoint, { ...options, skipAuthRetry: true });
    }
    redirectToLogin();
    throw new ApiError(401, "Session expired");
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Request failed" }));
    const message =
      error.detail || error.error?.message || error.message || "Request failed";
    throw new ApiError(response.status, message);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),

  upload: async <T>(endpoint: string, file: File): Promise<T> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: formData,
    });
    if (response.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) return api.upload<T>(endpoint, file);
      redirectToLogin();
      throw new ApiError(401, "Session expired");
    }
    if (!response.ok) throw new ApiError(response.status, "Upload failed");
    return response.json();
  },
};
