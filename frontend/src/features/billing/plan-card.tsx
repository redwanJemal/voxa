import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PlanCardProps = {
  name: string;
  price: string;
  features: string[];
  isCurrent: boolean;
  onSelect: () => void;
};

export function PlanCard({ name, price, features, isCurrent, onSelect }: PlanCardProps) {
  return (
    <Card className={cn(isCurrent && "border-primary")}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{name}</CardTitle>
          {isCurrent && <Badge>Current Plan</Badge>}
        </div>
        <div className="mt-2">
          <span className="text-3xl font-bold">{price}</span>
          {price !== "Custom" && <span className="text-muted-foreground">/month</span>}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="mb-6 space-y-2">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              {f}
            </li>
          ))}
        </ul>
        <Button
          className="w-full"
          variant={isCurrent ? "outline" : "default"}
          disabled={isCurrent}
          onClick={onSelect}
        >
          {isCurrent ? "Current Plan" : "Upgrade"}
        </Button>
      </CardContent>
    </Card>
  );
}
