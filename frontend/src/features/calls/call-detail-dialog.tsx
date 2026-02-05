import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCall } from "@/hooks/use-calls";
import { formatCurrency, formatDateTime, formatDuration } from "@/lib/utils";

type Props = {
  callId: string | null;
  onClose: () => void;
};

export function CallDetailDialog({ callId, onClose }: Props) {
  const { data: call, isLoading } = useCall(callId || "");

  return (
    <Dialog open={!!callId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Call Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : call ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge>{call.status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{formatDuration(call.duration_seconds)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">{formatDateTime(call.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cost</p>
                <p className="font-medium">{formatCurrency(call.cost_cents)}</p>
              </div>
            </div>
            {call.summary && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-sm font-medium">Summary</p>
                  <p className="text-sm text-muted-foreground">{call.summary}</p>
                </div>
              </>
            )}
            {call.transcript && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-sm font-medium">Transcript</p>
                  <pre className="max-h-64 overflow-y-auto rounded-lg bg-muted p-3 text-xs">
                    {call.transcript}
                  </pre>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Call not found.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
