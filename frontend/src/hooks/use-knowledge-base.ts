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

type SearchResult = {
  content: string;
  score: number;
  document_id: string;
  metadata: Record<string, unknown>;
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

export function useDocuments(kbId: string) {
  return useQuery({
    queryKey: ["documents", kbId],
    queryFn: () => api.get<Document[]>(`/knowledge-bases/${kbId}/documents`),
    enabled: !!kbId,
    // No polling needed — SSE (useKBEvents) handles real-time invalidation
  });
}

export function useUploadDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.upload<Document>(`/knowledge-bases/${kbId}/documents`, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      queryClient.invalidateQueries({ queryKey: ["documents", kbId] });
    },
  });
}

export function useDeleteDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.delete(`/knowledge-bases/${kbId}/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      queryClient.invalidateQueries({ queryKey: ["documents", kbId] });
    },
  });
}

export function useRetryDocument(kbId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => api.post<Document>(`/knowledge-bases/${kbId}/documents/${docId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", kbId] });
    },
  });
}

export function useSearchKnowledgeBase(kbId: string) {
  return useMutation({
    mutationFn: (data: { query: string; top_k?: number }) =>
      api.post<SearchResult[]>(`/knowledge-bases/${kbId}/search`, data),
  });
}
