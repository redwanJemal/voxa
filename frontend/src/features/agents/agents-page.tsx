import { Bot } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgents, useDeleteAgent } from "@/hooks/use-agents";
import { AgentCard } from "./agent-card";
import { CreateAgentDialog } from "./create-agent-dialog";
import { toast } from "sonner";

export function AgentsPage() {
  const { data: agents, isLoading } = useAgents();
  const deleteAgent = useDeleteAgent();

  const handleDelete = async (id: string) => {
    try {
      await deleteAgent.mutateAsync(id);
      toast.success("Agent deleted");
    } catch {
      toast.error("Failed to delete agent");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice Agents</h1>
          <p className="text-muted-foreground">Create and manage your AI voice agents.</p>
        </div>
        <CreateAgentDialog />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No agents yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">Create your first voice agent to get started.</p>
          <CreateAgentDialog />
        </div>
      )}
    </div>
  );
}
