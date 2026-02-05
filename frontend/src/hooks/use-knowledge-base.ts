import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

type KnowledgeBase = {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  total_documents: number;
  total_chunks: number;
  size_bytes: number;
  created_at: string;
};

type Document = {
  id: string;
  knowledge_base_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  chunk_count: number;
  status: string;
  error_message: string | null;
  created_at: string;
};

export function useKnowledgeBases(agentId: string) {
  return useQuery({
    queryKey: ["knowledge-bases", agentId],
    queryFn: () => api.get<KnowledgeBase[]>(`/agents/${agentId}/knowledge-bases`),
    enabled: !!agentId,
  });
}

export function useCreateKnowledgeBase(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post<KnowledgeBase>(`/agents/${agentId}/knowledge-bases`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge-bases", agentId] }),
  });
}

export function useUploadDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.upload<Document>(`/knowledge-bases/${kbId}/documents`, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}

export function useDeleteDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.delete(`/knowledge-bases/${kbId}/documents/${docId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] }),
  });
}
