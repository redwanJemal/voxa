import { useState } from "react";
import { Mic, MicOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LiveCall() {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Test Voice Call</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-6">
        <div
          className={cn(
            "flex h-32 w-32 items-center justify-center rounded-full transition-all",
            isActive
              ? "bg-primary/10 ring-4 ring-primary/20 animate-pulse"
              : "bg-muted",
          )}
        >
          <Phone className={cn("h-12 w-12", isActive ? "text-primary" : "text-muted-foreground")} />
        </div>
        <p className="text-sm text-muted-foreground">
          {isActive ? "Call in progress..." : "Start a test call with your agent"}
        </p>
        <div className="flex gap-3">
          {isActive && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Button
            size="lg"
            variant={isActive ? "destructive" : "default"}
            onClick={() => setIsActive(!isActive)}
            className="gap-2"
          >
            <Phone className="h-4 w-4" />
            {isActive ? "End Call" : "Start Call"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
