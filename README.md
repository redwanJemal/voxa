<p align="center">
  <img src="docs/assets/voxa-logo.svg" alt="Voxa Logo" width="200" />
</p>

<h1 align="center">Voxa — Build AI Voice Agents That Know Your Business</h1>

<p align="center">
  <strong>Create intelligent voice agents powered by your knowledge base. Deploy in minutes.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Tailwind-4.0-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Features

- 🎙️ **Voice AI Agents** — Real-time voice conversations powered by LLMs
- 📚 **Custom Knowledge Base** — Upload PDFs, docs, and text to train your agent
- 🔍 **Hybrid RAG Search** — Dense + sparse retrieval via Qdrant for accurate answers
- 🏢 **Multi-Tenant** — Organizations with role-based access control
- 📊 **Analytics Dashboard** — Call logs, usage metrics, and performance insights
- 🔐 **Google OAuth** — Seamless authentication with Google SSO
- 💳 **Usage-Based Billing** — Stripe integration with tiered plans
- 🚀 **Production-Ready** — Rate limiting, caching, audit logging, structured logs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, Celery |
| Database | PostgreSQL 16, Redis 7, Qdrant |
| AI/ML | OpenAI, LangChain, Deepgram STT/TTS |
| Infra | Docker Compose, nginx |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/redwanJemal/voxa.git
cd voxa

# Copy environment variables
cp .env.example .env

# Start all services
docker compose up -d

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Development Mode

```bash
make dev  # Starts everything with hot reload
```

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Client (Browser)                   │
│              React + TypeScript + Tailwind             │
└──────────────────┬───────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼───────────────────────────────────┐
│                  FastAPI Backend                       │
│  ┌─────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │  Auth    │  │  Agents  │  │  Knowledge Base  │    │
│  │  API     │  │  API     │  │  API             │    │
│  └────┬────┘  └────┬─────┘  └────────┬─────────┘    │
│       │            │                  │               │
│  ┌────▼────────────▼──────────────────▼─────────┐    │
│  │              Service Layer                    │    │
│  └────┬────────────┬──────────────────┬─────────┘    │
│       │            │                  │               │
│  ┌────▼────┐ ┌─────▼─────┐ ┌────────▼────────┐     │
│  │ PostgreSQL│ │   Redis   │ │    Qdrant       │     │
│  │  (Users, │ │  (Cache,  │ │  (Embeddings,   │     │
│  │  Agents) │ │  Sessions)│ │   RAG Search)   │     │
│  └─────────┘ └───────────┘ └─────────────────┘     │
└──────────────────────────────────────────────────────┘
         │                              │
    ┌────▼─────┐                 ┌──────▼──────┐
    │ Deepgram │                 │   OpenAI    │
    │ STT/TTS  │                 │ Embeddings  │
    └──────────┘                 └─────────────┘
```

## Screenshots

> Coming soon — UI screenshots will be added here.

## License

MIT © [Redwan Jemal](https://redwanjemal.dev)
