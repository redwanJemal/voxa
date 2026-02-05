import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useKnowledgeBases, useUploadDocument, useDeleteDocument } from "@/hooks/use-knowledge-base";
import { UploadZone } from "./upload-zone";
import { DocumentList } from "./document-list";
import { SearchTest } from "./search-test";
import { toast } from "sonner";

type Props = {
  agentId: string;
};

export function KnowledgePage({ agentId }: Props) {
  const { data: kbs, isLoading } = useKnowledgeBases(agentId);
  const kb = kbs?.[0];
  const uploadDoc = useUploadDocument(kb?.id || "");
  const deleteDoc = useDeleteDocument(kb?.id || "");

  const handleUpload = async (file: File) => {
    try {
      await uploadDoc.mutateAsync(file);
      toast.success("Document uploaded");
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
            <DocumentList documents={[]} onDelete={handleDelete} />
          </TabsContent>
          <TabsContent value="search" className="mt-4">
            <SearchTest kbId={kb.id} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
