import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Transcript = {
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

type Props = {
  agentId: string;
  agentName?: string;
};

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";

function getWsUrl(agentId: string, token: string): string {
  const base = API_URL.replace(/^http/, "ws");
  return `${base}/voice/${agentId}?token=${encodeURIComponent(token)}`;
}

export function LiveCall({ agentId, agentName }: Props) {
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [status, setStatus] = useState<string>("Ready");

  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Auto-scroll transcripts
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts]);

  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;

    const ctx = audioCtxRef.current || new AudioContext({ sampleRate: 16000 });
    audioCtxRef.current = ctx;

    while (audioQueueRef.current.length > 0) {
      const data = audioQueueRef.current.shift()!;
      try {
        const audioBuffer = await ctx.decodeAudioData(data.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
        });
      } catch {
        // If decoding fails (e.g., partial chunk), skip
      }
    }
    isPlayingRef.current = false;
  }, []);

  const startCall = useCallback(async () => {
    const token = localStorage.getItem("voxa_token");
    if (!token) {
      toast.error("Not authenticated");
      return;
    }

    setIsConnecting(true);
    setStatus("Requesting microphone...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch {
      toast.error("Microphone permission denied");
      setIsConnecting(false);
      setStatus("Ready");
      return;
    }

    setStatus("Connecting...");
    const wsUrl = getWsUrl(agentId, token);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("Connected, waiting for agent...");
    };

    ws.onmessage = async (event) => {
      if (event.data instanceof Blob) {
        // Audio frame from TTS
        const buffer = await event.data.arrayBuffer();
        audioQueueRef.current.push(buffer);
        playAudioQueue();
        return;
      }

      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "ready") {
          setIsActive(true);
          setIsConnecting(false);
          setStatus("Call active");
          setCallDuration(0);
          timerRef.current = setInterval(
            () => setCallDuration((d) => d + 1),
            1000
          );

          // Start capturing audio
          const audioCtx = new AudioContext({ sampleRate: 16000 });
          audioCtxRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(
            mediaStreamRef.current!
          );
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (
              isMuted ||
              !wsRef.current ||
              wsRef.current.readyState !== WebSocket.OPEN
            )
              return;
            const float32 = e.inputBuffer.getChannelData(0);
            // Convert float32 to int16 PCM
            const int16 = new Int16Array(float32.length);
            for (let i = 0; i < float32.length; i++) {
              const s = Math.max(-1, Math.min(1, float32[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            wsRef.current.send(int16.buffer);
          };

          source.connect(processor);
          processor.connect(audioCtx.destination);
        } else if (msg.type === "transcript") {
          setTranscripts((prev) => [
            ...prev,
            { role: msg.role, text: msg.text, timestamp: Date.now() },
          ]);
        } else if (msg.type === "error") {
          toast.error(msg.message);
          if (!isActive) {
            cleanup();
          }
        } else if (msg.type === "audio_end") {
          // Audio playback will handle itself via the queue
        }
      } catch {
        // Not JSON, ignore
      }
    };

    ws.onclose = () => {
      cleanup();
    };

    ws.onerror = () => {
      toast.error("WebSocket connection failed");
      cleanup();
    };
  }, [agentId, isMuted, isActive, playAudioQueue]);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsActive(false);
    setIsConnecting(false);
    setStatus("Ready");
  }, []);

  const endCall = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_call" }));
    }
    cleanup();
  }, [cleanup]);

  const endTurn = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_turn" }));
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg">
            {agentName ? `Test Call — ${agentName}` : "Test Voice Call"}
          </CardTitle>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Badge variant={isActive ? "default" : "secondary"}>{status}</Badge>
            {isActive && (
              <Badge variant="outline">{formatDuration(callDuration)}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {/* Visualization */}
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full transition-all",
              isActive
                ? "bg-primary/10 ring-4 ring-primary/20 animate-pulse"
                : isConnecting
                  ? "bg-yellow-500/10 ring-4 ring-yellow-500/20"
                  : "bg-muted"
            )}
          >
            {isConnecting ? (
              <Loader2 className="h-10 w-10 animate-spin text-yellow-500" />
            ) : (
              <Phone
                className={cn(
                  "h-10 w-10",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {isActive && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <MicOff className="h-4 w-4 text-destructive" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
                <Button size="sm" variant="secondary" onClick={endTurn}>
                  Send
                </Button>
              </>
            )}
            <Button
              size="lg"
              variant={isActive ? "destructive" : "default"}
              onClick={isActive ? endCall : startCall}
              disabled={isConnecting}
              className="gap-2"
            >
              {isActive ? (
                <>
                  <PhoneOff className="h-4 w-4" /> End Call
                </>
              ) : isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Connecting...
                </>
              ) : (
                <>
                  <Phone className="h-4 w-4" /> Start Call
                </>
              )}
            </Button>
          </div>

          {isActive && (
            <p className="text-xs text-muted-foreground">
              Speak, then press <strong>Send</strong> when done talking
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      {transcripts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3 pr-4">
                {transcripts.map((t, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      t.role === "user"
                        ? "ml-8 bg-primary/10 text-right"
                        : "mr-8 bg-muted"
                    )}
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      {t.role === "user" ? "You" : "Agent"}
                    </span>
                    <p className="mt-0.5">{t.text}</p>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
