import { useState } from "react";
import { Copy, Check, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Props = {
  agentId: string;
  agentName: string;
};

type WidgetTokenResponse = {
  token: string;
  agent_id: string;
  embed_code: string;
};

export function WidgetIntegration({ agentId, agentName }: Props) {
  const [embedCode, setEmbedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateToken = useMutation({
    mutationFn: () => api.post<WidgetTokenResponse>(`/agents/${agentId}/widget-token`),
    onSuccess: (data) => {
      setEmbedCode(data.embed_code);
      toast.success("Widget token generated!");
    },
    onError: () => {
      toast.error("Failed to generate token");
    },
  });

  const copyCode = async () => {
    if (!embedCode) return;
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Website Widget
          </CardTitle>
          <CardDescription>
            Embed {agentName} on any website with a single script tag
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!embedCode ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a widget token to embed your voice agent on any website.
                The token is valid for 90 days.
              </p>
              <Button
                onClick={() => generateToken.mutate()}
                disabled={generateToken.isPending}
              >
                {generateToken.isPending ? "Generating..." : "Generate Widget Token"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{embedCode}</code>
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={copyCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="rounded-lg border bg-blue-500/5 border-blue-500/20 p-4">
                <h4 className="font-medium mb-2">How to use:</h4>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li>Copy the code above</li>
                  <li>Paste it before the closing <code className="bg-muted px-1 rounded">&lt;/body&gt;</code> tag on your website</li>
                  <li>A floating button will appear for voice conversations</li>
                </ol>
              </div>

              <Button
                variant="outline"
                onClick={() => generateToken.mutate()}
                disabled={generateToken.isPending}
              >
                Regenerate Token
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Customization Options</CardTitle>
          <CardDescription>
            Configure the widget appearance with data attributes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-4 py-2 border-b">
              <span className="font-medium">Attribute</span>
              <span className="font-medium">Default</span>
              <span className="font-medium">Description</span>
            </div>
            <div className="grid grid-cols-3 gap-4 py-2">
              <code className="text-xs bg-muted px-1 rounded">data-position</code>
              <span className="text-muted-foreground">bottom-right</span>
              <span className="text-muted-foreground">bottom-right, bottom-left, top-right, top-left</span>
            </div>
            <div className="grid grid-cols-3 gap-4 py-2">
              <code className="text-xs bg-muted px-1 rounded">data-primary-color</code>
              <span className="text-muted-foreground">#6366f1</span>
              <span className="text-muted-foreground">Button & accent color (hex)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Integration</CardTitle>
          <CardDescription>
            For custom integrations, use the WebSocket API directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            <code>{`// Connect via WebSocket
const ws = new WebSocket(
  'wss://voxa.redwanjemal.dev/api/v1/voice/${agentId}?token=YOUR_TOKEN'
);

// Send audio (16-bit PCM, 16kHz)
ws.send(audioBuffer);

// End turn (triggers response)
ws.send(JSON.stringify({ type: 'end_turn' }));

// Receive transcripts & audio
ws.onmessage = (event) => {
  if (typeof event.data === 'string') {
    const data = JSON.parse(event.data);
    console.log(data); // { type: 'transcript', role: 'user'|'assistant', text: '...' }
  } else {
    // Binary audio response
    playAudio(event.data);
  }
};`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
