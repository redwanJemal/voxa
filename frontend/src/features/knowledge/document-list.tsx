import { FileText, Trash2, Loader2, AlertCircle, CheckCircle2, Clock, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate } from "@/lib/utils";

type Document = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  chunk_count: number;
  status: string;
  error_message?: string | null;
  created_at: string;
};

type Props = {
  documents: Document[];
  onDelete: (id: string) => void;
  onRetry?: (id: string) => void;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }
> = {
  completed: {
    variant: "default",
    icon: <CheckCircle2 className="h-3 w-3" />,
    label: "Completed",
  },
  processing: {
    variant: "secondary",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    label: "Processing",
  },
  pending: {
    variant: "outline",
    icon: <Clock className="h-3 w-3" />,
    label: "Pending",
  },
  failed: {
    variant: "destructive",
    icon: <AlertCircle className="h-3 w-3" />,
    label: "Failed",
  },
};

export function DocumentList({ documents, onDelete, onRetry }: Props) {
  if (documents.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No documents uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => {
        const config = statusConfig[doc.status] || statusConfig.pending;
        return (
          <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{doc.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(doc.size_bytes)}
                  {doc.status === "completed" && ` · ${doc.chunk_count} chunks`}
                  {" · "}
                  {formatDate(doc.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {doc.status === "failed" && doc.error_message ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant={config.variant} className="gap-1">
                        {config.icon}
                        {config.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{doc.error_message}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Badge variant={config.variant} className="gap-1">
                  {config.icon}
                  {config.label}
                </Badge>
              )}
              {doc.status === "failed" && onRetry && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRetry(doc.id)}>
                        <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Retry indexing</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(doc.id)}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
