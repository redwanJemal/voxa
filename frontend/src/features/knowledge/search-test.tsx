import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
  kbId: string;
};

export function SearchTest({ kbId: _kbId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ content: string; score: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      // Would call api.post(`/knowledge-bases/${kbId}/search`, { query })
      setResults([]);
    } finally {
      setIsSearching(false);
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
        <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
      {results.length > 0 ? (
        <div className="space-y-2">
          {results.map((r, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <p className="text-sm">{r.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">Score: {r.score.toFixed(3)}</p>
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
