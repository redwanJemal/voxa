import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useApiKeys,
  useSaveApiKey,
  useDeleteApiKey,
  useTestApiKey,
  type ProviderKey,
} from "@/hooks/use-api-keys";
import { toast } from "sonner";
import {
  Key,
  Shield,
  CheckCircle2,
  Loader2,
  Trash2,
  FlaskConical,
  Settings2,
  Building2,
} from "lucide-react";

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4, GPT-3.5 models",
    placeholder: "sk-...",
  },
  {
    id: "deepgram",
    name: "Deepgram",
    description: "Speech-to-Text and Text-to-Speech",
    placeholder: "dg-...",
  },
  {
    id: "google",
    name: "Google AI",
    description: "Gemini models",
    placeholder: "AI...",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models",
    placeholder: "sk-ant-...",
  },
  {
    id: "groq",
    name: "Groq",
    description: "Llama, Mixtral (fast inference)",
    placeholder: "gsk_...",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek Chat",
    placeholder: "sk-...",
  },
];

function ProviderKeyCard({
  provider,
  existing,
  onConfigure,
  onTest,
  onRemove,
  isTesting,
}: {
  provider: (typeof PROVIDERS)[number];
  existing: ProviderKey | undefined;
  onConfigure: () => void;
  onTest: () => void;
  onRemove: () => void;
  isTesting: boolean;
}) {
  const configured = !!existing;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription className="text-xs">
                {provider.description}
              </CardDescription>
            </div>
          </div>
          <Badge variant={configured ? "default" : "secondary"}>
            {configured ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Configured
              </span>
            ) : (
              "Not configured"
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {existing && (
          <p className="mb-3 font-mono text-sm text-muted-foreground">
            {existing.masked_key}
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onConfigure}>
            <Settings2 className="mr-1 h-3 w-3" />
            {configured ? "Update" : "Configure"}
          </Button>
          {configured && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={onTest}
                disabled={isTesting}
              >
                {isTesting ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <FlaskConical className="mr-1 h-3 w-3" />
                )}
                Test
              </Button>
              <Button size="sm" variant="ghost" onClick={onRemove}>
                <Trash2 className="mr-1 h-3 w-3" />
                Remove
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsPage() {
  const { data: keys = [], isLoading } = useApiKeys();
  const saveKey = useSaveApiKey();
  const deleteKey = useDeleteApiKey();
  const testKey = useTestApiKey();

  const [configDialog, setConfigDialog] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const keyMap = new Map(keys.map((k) => [k.provider, k]));
  const selectedProvider = PROVIDERS.find((p) => p.id === configDialog);

  const handleSave = async () => {
    if (!configDialog || !keyInput.trim()) return;
    try {
      await saveKey.mutateAsync({
        provider: configDialog,
        api_key: keyInput.trim(),
      });
      toast.success(`${selectedProvider?.name} key saved`);
      setConfigDialog(null);
      setKeyInput("");
    } catch {
      toast.error("Failed to save key");
    }
  };

  const handleTest = async (provider: string) => {
    setTestingProvider(provider);
    try {
      const result = await testKey.mutateAsync(provider);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Test failed");
    } finally {
      setTestingProvider(null);
    }
  };

  const handleRemove = async (provider: string) => {
    try {
      await deleteKey.mutateAsync(provider);
      toast.success("Key removed");
    } catch {
      toast.error("Failed to remove key");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and organization settings.
        </p>
      </div>

      <Tabs defaultValue="api-keys">
        <TabsList>
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" /> API Keys
          </TabsTrigger>
          <TabsTrigger value="organization" className="gap-2">
            <Building2 className="h-4 w-4" /> Organization
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-6 space-y-6">
          {/* Banner */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <Shield className="h-5 w-5 text-primary" />
              <p className="text-sm">
                Add your API keys to enable voice AI features. Your keys are{" "}
                <strong>encrypted at rest</strong> and never exposed in API
                responses.
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-10 rounded bg-muted" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {PROVIDERS.map((provider) => (
                <ProviderKeyCard
                  key={provider.id}
                  provider={provider}
                  existing={keyMap.get(provider.id)}
                  onConfigure={() => {
                    setConfigDialog(provider.id);
                    setKeyInput("");
                  }}
                  onTest={() => handleTest(provider.id)}
                  onRemove={() => handleRemove(provider.id)}
                  isTesting={testingProvider === provider.id}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="organization" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>
                Manage your organization settings and members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Organization management coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Configure Dialog */}
      <Dialog
        open={!!configDialog}
        onOpenChange={(open) => {
          if (!open) {
            setConfigDialog(null);
            setKeyInput("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Configure {selectedProvider?.name} API Key
            </DialogTitle>
            <DialogDescription>
              Enter your {selectedProvider?.name} API key. It will be encrypted
              before storage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder={selectedProvider?.placeholder}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfigDialog(null);
                setKeyInput("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!keyInput.trim() || saveKey.isPending}
            >
              {saveKey.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
