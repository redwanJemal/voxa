import { motion } from "framer-motion";
import {
  Mic,
  Brain,
  FileText,
  Shield,
  BarChart3,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Mic,
    title: "Natural Voice Conversations",
    description: "Real-time voice interactions powered by Deepgram's STT/TTS with sub-second latency.",
  },
  {
    icon: Brain,
    title: "Custom Knowledge Base",
    description: "Upload PDFs, docs, and text. Your agent answers from your data with RAG-powered accuracy.",
  },
  {
    icon: Zap,
    title: "Deploy in Minutes",
    description: "Configure your agent, upload knowledge, and go live. No coding required.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "SOC2-ready architecture with role-based access, audit logs, and data encryption.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Track call volume, sentiment, and resolution rates. Optimize your agents with data.",
  },
  {
    icon: FileText,
    title: "Full Transcripts",
    description: "Every conversation is transcribed and searchable. Review, analyze, and improve.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need for Voice AI
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From knowledge ingestion to real-time voice, Voxa handles it all.
          </p>
        </div>
        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="group rounded-xl border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
