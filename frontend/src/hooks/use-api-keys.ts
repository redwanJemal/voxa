import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type ProviderKey = {
  id: string;
  provider: string;
  label: string | null;
  masked_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProviderKeyTestResult = {
  provider: string;
  success: boolean;
  message: string;
};

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: () => api.get<ProviderKey[]>("/settings/api-keys"),
  });
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider: string; api_key: string; label?: string }) =>
      api.post<ProviderKey>("/settings/api-keys", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) =>
      api.delete(`/settings/api-keys/${provider}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

export function useTestApiKey() {
  return useMutation({
    mutationFn: (provider: string) =>
      api.post<ProviderKeyTestResult>(`/settings/api-keys/${provider}/test`),
  });
}
