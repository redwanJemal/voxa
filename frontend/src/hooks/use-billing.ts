import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type UsageSummary = {
  resource: string;
  total: number;
  unit: string;
  cost_cents: number;
};

export function useUsage() {
  return useQuery({
    queryKey: ["billing", "usage"],
    queryFn: () => api.get<UsageSummary[]>("/billing/usage"),
  });
}
