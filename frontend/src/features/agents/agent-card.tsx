import { Link } from "react-router-dom";
import { Bot, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelative } from "@/lib/utils";

type AgentCardProps = {
  agent: {
    id: string;
    name: string;
    description: string | null;
    llm_model: string;
    language: string;
    is_active: boolean;
    created_at: string;
  };
  onDelete: (id: string) => void;
};

export function AgentCard({ agent, onDelete }: AgentCardProps) {
  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">
              <Link to={`/dashboard/agents/${agent.id}`} className="hover:underline">
                {agent.name}
              </Link>
            </CardTitle>
            <p className="text-xs text-muted-foreground">{formatRelative(agent.created_at)}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/dashboard/agents/${agent.id}`}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(agent.id)} className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
          {agent.description || "No description"}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{agent.llm_model}</Badge>
          <Badge variant="outline">{agent.language}</Badge>
          <Badge variant={agent.is_active ? "default" : "secondary"}>
            {agent.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
