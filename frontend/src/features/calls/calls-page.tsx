import { useState } from "react";
import { Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCalls } from "@/hooks/use-calls";
import { formatDateTime, formatDuration } from "@/lib/utils";
import { CallDetailDialog } from "./call-detail-dialog";

export function CallsPage() {
  const [page, setPage] = useState(1);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const { data, isLoading } = useCalls(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Call Logs</h1>
        <p className="text-muted-foreground">Review all voice calls handled by your agents.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : data && data.items.length > 0 ? (
        <>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Caller</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCallId(call.id)}
                  >
                    <TableCell>{call.caller_id || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{call.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                    <TableCell>{call.sentiment_score?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell>{formatDateTime(call.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {data.page} · {data.total} total calls
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center py-16">
          <Phone className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No calls yet</h3>
          <p className="text-sm text-muted-foreground">Calls will appear here once your agents handle them.</p>
        </div>
      )}

      <CallDetailDialog callId={selectedCallId} onClose={() => setSelectedCallId(null)} />
    </div>
  );
}
