import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/hooks/use-agents";
import { AgentSettingsForm } from "./agent-settings-form";
import { KnowledgePage } from "@/features/knowledge/knowledge-page";

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isLoading } = useAgent(id || "");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center py-16">
        <p className="text-muted-foreground">Agent not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/dashboard/agents">Back to Agents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="text-sm text-muted-foreground">{agent.description || "No description"}</p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" /> Settings
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="gap-2">
            <BookOpen className="h-4 w-4" /> Knowledge Base
          </TabsTrigger>
        </TabsList>
        <TabsContent value="settings" className="mt-6">
          <AgentSettingsForm agent={agent} />
        </TabsContent>
        <TabsContent value="knowledge" className="mt-6">
          <KnowledgePage agentId={agent.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
