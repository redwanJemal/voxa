import { Progress } from "@/components/ui/progress";

type UsageMeterProps = {
  label: string;
  current: number;
  limit: number;
  unit: string;
};

export function UsageMeter({ label, current, limit, unit }: UsageMeterProps) {
  const percentage = Math.min((current / limit) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {current} / {limit} {unit}
        </span>
      </div>
      <Progress value={percentage} />
    </div>
  );
}
