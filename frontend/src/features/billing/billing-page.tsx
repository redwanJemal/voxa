import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanCard } from "./plan-card";
import { UsageMeter } from "./usage-meter";
import { useUsage } from "@/hooks/use-billing";
import { useAgents } from "@/hooks/use-agents";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const plans = [
  { name: "Free", price: "$0", features: ["1 agent", "10 MB KB", "50 calls/month"] },
  { name: "Starter", price: "$19", features: ["5 agents", "100 MB KB", "500 calls/month"] },
  { name: "Pro", price: "$49", features: ["25 agents", "500 MB KB", "Unlimited calls"] },
  { name: "Enterprise", price: "Custom", features: ["Unlimited agents", "5 GB KB", "SLA"] },
];

// Plan limits for free tier
const PLAN_LIMITS = {
  agents: 1,
  kb_storage_mb: 10,
  calls: 50,
};

export function BillingPage() {
  const currentPlan = "free";
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: agents, isLoading: agentsLoading } = useAgents();

  const handleUpgrade = (plan: string) => {
    toast.info(`Upgrading to ${plan} — Stripe integration coming soon`);
  };

  // Extract usage values from API response
  const getUsageValue = (resource: string): number => {
    if (!usage) return 0;
    const item = usage.find((u) => u.resource === resource);
    return item ? item.total : 0;
  };

  const agentCount = agents?.length ?? 0;
  const kbUsageMB = Math.round(getUsageValue("kb_storage") / (1024 * 1024) * 100) / 100 || 0;
  const callCount = getUsageValue("calls");

  const isLoading = usageLoading || agentsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and usage.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <>
              <UsageMeter label="Agents" current={agentCount} limit={PLAN_LIMITS.agents} unit="agents" />
              <UsageMeter label="Knowledge Base" current={kbUsageMB} limit={PLAN_LIMITS.kb_storage_mb} unit="MB" />
              <UsageMeter label="Calls" current={callCount} limit={PLAN_LIMITS.calls} unit="calls" />
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PlanCard
            key={plan.name}
            name={plan.name}
            price={plan.price}
            features={plan.features}
            isCurrent={plan.name.toLowerCase() === currentPlan}
            onSelect={() => handleUpgrade(plan.name)}
          />
        ))}
      </div>
    </div>
  );
}
