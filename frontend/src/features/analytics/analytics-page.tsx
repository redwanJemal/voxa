import { Clock, DollarSign, Phone, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallAnalytics } from "@/hooks/use-calls";
import { formatCurrency, formatMinutes } from "@/lib/utils";
import { StatCard } from "./stat-card";
import { CallVolumeChart } from "./call-volume-chart";
import { UsageChart } from "./usage-chart";

export function AnalyticsPage() {
  const { data: analytics, isLoading } = useCallAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const stats = analytics || {
    total_calls: 0,
    total_duration_seconds: 0,
    average_duration_seconds: 0,
    total_cost_cents: 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Insights into your voice agent performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Calls" value={String(stats.total_calls)} icon={Phone} />
        <StatCard
          title="Total Duration"
          value={formatMinutes(stats.total_duration_seconds)}
          icon={Clock}
        />
        <StatCard
          title="Avg Duration"
          value={formatMinutes(stats.average_duration_seconds)}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Cost"
          value={formatCurrency(stats.total_cost_cents)}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CallVolumeChart />
        <UsageChart />
      </div>
    </div>
  );
}
