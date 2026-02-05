import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type Call = {
  id: string;
  agent_id: string;
  caller_id: string | null;
  status: string;
  duration_seconds: number;
  sentiment_score: number | null;
  created_at: string;
};

type CallDetail = Call & {
  organization_id: string;
  transcript: string | null;
  summary: string | null;
  cost_cents: number;
};

type CallsResponse = {
  items: Call[];
  total: number;
  page: number;
  page_size: number;
};

type CallAnalytics = {
  total_calls: number;
  total_duration_seconds: number;
  average_duration_seconds: number;
  total_cost_cents: number;
  calls_by_status: Record<string, number>;
  calls_by_day: Array<{ date: string; count: number }>;
};

export function useCalls(page = 1, agentId?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (agentId) params.set("agent_id", agentId);
  return useQuery({
    queryKey: ["calls", page, agentId],
    queryFn: () => api.get<CallsResponse>(`/calls?${params}`),
  });
}

export function useCall(id: string) {
  return useQuery({
    queryKey: ["calls", id],
    queryFn: () => api.get<CallDetail>(`/calls/${id}`),
    enabled: !!id,
  });
}

export function useCallAnalytics() {
  return useQuery({
    queryKey: ["calls", "analytics"],
    queryFn: () => api.get<CallAnalytics>("/calls/analytics"),
  });
}
