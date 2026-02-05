import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSearchKnowledgeBase } from "@/hooks/use-knowledge-base";
import { toast } from "sonner";

type Props = {
  kbId: string;
};

type SearchResultItem = {
  content: string;
  score: number;
  document_id: string;
  metadata: Record<string, unknown>;
};

export function SearchTest({ kbId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const searchMutation = useSearchKnowledgeBase(kbId);

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const data = await searchMutation.mutateAsync({ query, top_k: 5 });
      setResults(data);
      if (data.length === 0) {
        toast.info("No results found");
      }
    } catch {
      toast.error("Search failed");
      setResults([]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Test a search query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={searchMutation.isPending} className="gap-2">
          <Search className="h-4 w-4" />
          {searchMutation.isPending ? "Searching..." : "Search"}
        </Button>
      </div>
      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((r, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap">{r.content}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Score: {r.score.toFixed(3)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Doc: {r.document_id.slice(0, 8)}...
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Enter a query to test your knowledge base search.
        </p>
      )}
    </div>
  );
}
