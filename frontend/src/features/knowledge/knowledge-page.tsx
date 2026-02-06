import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useKnowledgeBases,
  useCreateKnowledgeBase,
  useUploadDocument,
  useDeleteDocument,
  useRetryDocument,
  useDocuments,
} from "@/hooks/use-knowledge-base";
import { useKBEvents } from "@/hooks/use-kb-events";
import { UploadZone } from "./upload-zone";
import { DocumentList } from "./document-list";
import { SearchTest } from "./search-test";
import { toast } from "sonner";

type Props = {
  agentId: string;
};

export function KnowledgePage({ agentId }: Props) {
  const { data: kbs, isLoading } = useKnowledgeBases(agentId);
  const createKb = useCreateKnowledgeBase(agentId);
  const kb = kbs?.[0];
  const kbId = kb?.id || "";

  const { data: documents = [], isLoading: docsLoading } = useDocuments(kbId);
  const uploadDoc = useUploadDocument(kbId);
  const deleteDoc = useDeleteDocument(kbId);
  const retryDoc = useRetryDocument(kbId);

  // SSE: real-time updates from background processing
  useKBEvents(kbId);

  // Auto-create a default KB if none exists
  useEffect(() => {
    if (!isLoading && kbs && kbs.length === 0 && !createKb.isPending && !createKb.isSuccess) {
      createKb.mutate({ name: "Default" });
    }
  }, [isLoading, kbs, createKb.isPending, createKb.isSuccess]);

  const handleUpload = async (file: File) => {
    if (!kbId) {
      toast.error("No knowledge base available");
      return;
    }
    try {
      await uploadDoc.mutateAsync(file);
      toast.success("Document uploaded — processing in background");
    } catch {
      toast.error("Upload failed");
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDoc.mutateAsync(docId);
      toast.success("Document deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleRetry = async (docId: string) => {
    try {
      await retryDoc.mutateAsync(docId);
      toast.success("Retrying document indexing...");
    } catch {
      toast.error("Retry failed");
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadZone onUpload={handleUpload} isUploading={uploadDoc.isPending} />
        </CardContent>
      </Card>

      {kb && (
        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="search">Test Search</TabsTrigger>
          </TabsList>
          <TabsContent value="documents" className="mt-4">
            {docsLoading ? (
              <Skeleton className="h-32" />
            ) : (
              <DocumentList documents={documents} onDelete={handleDelete} onRetry={handleRetry} />
            )}
          </TabsContent>
          <TabsContent value="search" className="mt-4">
            <SearchTest kbId={kb.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
