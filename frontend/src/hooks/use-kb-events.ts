import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

type KBEvent = {
  type: string;
  doc_id: string;
  filename?: string;
  chunk_count?: number;
  error?: string;
};

/**
 * Subscribe to real-time knowledge base events via SSE.
 * Automatically invalidates TanStack Query caches on events.
 */
export function useKBEvents(kbId: string) {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  const handleEvent = useCallback(
    (event: MessageEvent) => {
      try {
        const data: KBEvent = JSON.parse(event.data);

        // Invalidate document + KB queries on any doc event
        queryClient.invalidateQueries({ queryKey: ["documents", kbId] });
        queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });

        // Log for debugging
        console.log(`[KB SSE] ${event.type}:`, data);
      } catch {
        // ignore malformed events
      }
    },
    [kbId, queryClient],
  );

  useEffect(() => {
    if (!kbId) return;

    const token = localStorage.getItem("voxa_token") || "";
    const url = `${API_URL}/knowledge-bases/${kbId}/events?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    // Listen for specific event types
    es.addEventListener("doc:processing", handleEvent);
    es.addEventListener("doc:completed", handleEvent);
    es.addEventListener("doc:failed", handleEvent);
    es.addEventListener("doc:deleted", handleEvent);
    es.addEventListener("connected", () => {
      console.log("[KB SSE] Connected to", kbId);
    });

    es.onerror = () => {
      // EventSource auto-reconnects, just log
      console.warn("[KB SSE] Connection error, will reconnect...");
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [kbId, handleEvent]);
}
