import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanCard } from "./plan-card";
import { UsageMeter } from "./usage-meter";
import { toast } from "sonner";

const plans = [
  { name: "Free", price: "$0", features: ["1 agent", "10 MB KB", "50 calls/month"] },
  { name: "Starter", price: "$19", features: ["5 agents", "100 MB KB", "500 calls/month"] },
  { name: "Pro", price: "$49", features: ["25 agents", "500 MB KB", "Unlimited calls"] },
  { name: "Enterprise", price: "Custom", features: ["Unlimited agents", "5 GB KB", "SLA"] },
];

export function BillingPage() {
  const currentPlan = "free";

  const handleUpgrade = (plan: string) => {
    toast.info(`Upgrading to ${plan} — Stripe integration coming soon`);
  };

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
          <UsageMeter label="Agents" current={1} limit={1} unit="agents" />
          <UsageMeter label="Knowledge Base" current={2} limit={10} unit="MB" />
          <UsageMeter label="Calls" current={12} limit={50} unit="calls" />
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
