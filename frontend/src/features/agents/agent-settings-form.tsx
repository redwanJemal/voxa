import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useUpdateAgent } from "@/hooks/use-agents";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  system_prompt: z.string().min(1),
  greeting_message: z.string().min(1),
  llm_model: z.string().min(1),
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
    defaultValues: agent,
  });

  const onSubmit = async (data: FormData) => {
    try {
      await updateAgent.mutateAsync(data);
      toast.success("Agent updated");
    } catch {
      toast.error("Failed to update agent");
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>LLM Model</Label>
          <Input {...register("llm_model")} />
        </div>
        <div className="space-y-2">
          <Label>Language</Label>
          <Input {...register("language")} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Active</Label>
        <Switch checked={watch("is_active")} onCheckedChange={(v) => setValue("is_active", v)} />
      </div>
      <Button type="submit" disabled={updateAgent.isPending}>
        {updateAgent.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
