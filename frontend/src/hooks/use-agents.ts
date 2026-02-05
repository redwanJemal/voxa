import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Agent = {
  id: string;
  name: string;
  description: string | null;
  llm_model: string;
  language: string;
  is_active: boolean;
  created_at: string;
};

type AgentDetail = Agent & {
  organization_id: string;
  system_prompt: string;
  greeting_message: string;
  stt_provider: string;
  tts_provider: string;
  tts_voice: string;
  max_call_duration_seconds: number;
  tools: Record<string, unknown>;
  updated_at: string;
};

type CreateAgent = {
  name: string;
  description?: string;
  system_prompt?: string;
  greeting_message?: string;
  llm_model?: string;
  language?: string;
};

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => api.get<Agent[]>("/agents"),
  });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ["agents", id],
    queryFn: () => api.get<AgentDetail>(`/agents/${id}`),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAgent) => api.post<AgentDetail>("/agents", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });
}

export function useUpdateAgent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<AgentDetail>) => api.patch<AgentDetail>(`/agents/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agents", id] });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/agents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });
}
