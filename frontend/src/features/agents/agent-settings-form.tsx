import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateAgent } from "@/hooks/use-agents";
import { toast } from "sonner";

const PROVIDER_MODELS: Record<string, { label: string; models: string[] }> = {
  openai: {
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  google: {
    label: "Google (Gemini)",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
  anthropic: {
    label: "Anthropic",
    models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest"],
  },
  groq: {
    label: "Groq",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  },
  deepseek: {
    label: "DeepSeek",
    models: ["deepseek-chat"],
  },
};

const TTS_VOICES = [
  "aura-asteria-en",
  "aura-luna-en",
  "aura-stella-en",
  "aura-athena-en",
  "aura-hera-en",
  "aura-orion-en",
  "aura-arcas-en",
  "aura-perseus-en",
  "aura-angus-en",
  "aura-orpheus-en",
  "aura-helios-en",
  "aura-zeus-en",
];

const schema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  system_prompt: z.string().min(1),
  greeting_message: z.string().min(1),
  llm_provider: z.string().min(1),
  llm_model: z.string().min(1),
  stt_provider: z.string().min(1),
  tts_provider: z.string().min(1),
  tts_voice: z.string().min(1),
  language: z.string().min(1),
  max_call_duration_seconds: z.number().min(30).max(3600),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

type Props = {
  agent: FormData & { id: string };
};

export function AgentSettingsForm({ agent }: Props) {
  const updateAgent = useUpdateAgent(agent.id);
  const { register, handleSubmit, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      ...agent,
      llm_provider: agent.llm_provider || "openai",
      stt_provider: agent.stt_provider || "deepgram",
      tts_provider: agent.tts_provider || "deepgram",
      tts_voice: agent.tts_voice || "aura-asteria-en",
    },
  });

  const currentProvider = watch("llm_provider");
  const currentModels =
    PROVIDER_MODELS[currentProvider]?.models || PROVIDER_MODELS.openai.models;

  const onSubmit = async (data: FormData) => {
    try {
      await updateAgent.mutateAsync(data);
      toast.success("Agent updated");
    } catch {
      toast.error("Failed to update agent");
    }
  };

  const handleProviderChange = (value: string) => {
    setValue("llm_provider", value);
    // Reset model to first of the new provider
    const models = PROVIDER_MODELS[value]?.models;
    if (models && models.length > 0) {
      setValue("llm_model", models[0]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input {...register("name")} />
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Input {...register("description")} />
      </div>
      <div className="space-y-2">
        <Label>System Prompt</Label>
        <Textarea {...register("system_prompt")} rows={5} />
      </div>
      <div className="space-y-2">
        <Label>Greeting Message</Label>
        <Input {...register("greeting_message")} />
      </div>

      {/* LLM Provider + Model */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>LLM Provider</Label>
          <Select value={currentProvider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDER_MODELS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>LLM Model</Label>
          <Select
            value={watch("llm_model")}
            onValueChange={(v) => setValue("llm_model", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* STT/TTS Provider + Voice */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>STT Provider</Label>
          <Select
            value={watch("stt_provider")}
            onValueChange={(v) => setValue("stt_provider", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deepgram">Deepgram</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>TTS Provider</Label>
          <Select
            value={watch("tts_provider")}
            onValueChange={(v) => setValue("tts_provider", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deepgram">Deepgram</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>TTS Voice</Label>
          <Select
            value={watch("tts_voice")}
            onValueChange={(v) => setValue("tts_voice", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TTS_VOICES.map((voice) => (
                <SelectItem key={voice} value={voice}>
                  {voice.replace("aura-", "").replace("-en", "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Language</Label>
          <Input {...register("language")} />
        </div>
        <div className="space-y-2">
          <Label>Max Call Duration (seconds)</Label>
          <Input
            type="number"
            {...register("max_call_duration_seconds", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch
          checked={watch("is_active")}
          onCheckedChange={(v) => setValue("is_active", v)}
        />
      </div>
      <Button type="submit" disabled={updateAgent.isPending}>
        {updateAgent.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
