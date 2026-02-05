"""WebSocket endpoint for live voice calls."""

import json
import struct
import time
from uuid import UUID

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.core.security import verify_token
from app.models.agent import Agent
from app.models.knowledge_base import KnowledgeBase
from app.models.user import User
from app.services import provider_key_service
from app.voice.pipeline import VoicePipeline

logger = structlog.get_logger("voice_ws")
router = APIRouter()

# WAV header for 16-bit PCM mono 16kHz
def _wav_header(data_len: int, sample_rate: int = 16000, channels: int = 1, bits: int = 16) -> bytes:
    """Build a minimal WAV header for raw PCM data."""
    byte_rate = sample_rate * channels * bits // 8
    block_align = channels * bits // 8
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + data_len,
        b"WAVE",
        b"fmt ",
        16,
        1,  # PCM
        channels,
        sample_rate,
        byte_rate,
        block_align,
        bits,
        b"data",
        data_len,
    )
    return header


async def _get_agent_and_keys(
    agent_id: UUID, org_id: UUID, db: AsyncSession
) -> tuple[Agent | None, dict[str, str], str | None]:
    """Load agent, provider keys, and KB collection name."""
    result = await db.execute(
        select(Agent).where(Agent.id == agent_id, Agent.organization_id == org_id)
    )
    agent = result.scalar_one_or_none()
    if agent is None:
        return None, {}, None

    # Gather provider keys
    keys: dict[str, str] = {}
    for provider in ["openai", "deepgram", "google", "anthropic", "groq", "deepseek"]:
        key = await provider_key_service.get_key(org_id, provider, db)
        if key:
            keys[provider] = key

    # Check for KB
    collection_name: str | None = None
    kb_result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.agent_id == agent_id).limit(1)
    )
    kb = kb_result.scalar_one_or_none()
    if kb:
        collection_name = f"kb_{kb.id}"

    return agent, keys, collection_name


@router.websocket("/voice/{agent_id}")
async def voice_websocket(
    websocket: WebSocket,
    agent_id: str,
    token: str = Query(...),
):
    """WebSocket voice call endpoint.

    Protocol:
    - Client sends binary frames (raw 16-bit PCM 16kHz mono audio)
    - Client sends JSON `{"type": "end_turn"}` to signal end of speech
    - Server responds with JSON transcript + binary audio frames
    - Server sends JSON `{"type": "transcript", "role": "user"|"assistant", "text": "..."}`
    - Server sends binary frames (mp3/wav audio from TTS)
    - Server sends JSON `{"type": "audio_end"}` when done streaming audio
    """
    # Auth
    try:
        payload = verify_token(token)
        user_id = UUID(payload["sub"])
    except Exception:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await websocket.accept()
    logger.info("voice_ws_connected", agent_id=agent_id, user_id=str(user_id))

    # Load agent + keys
    async with async_session_factory() as db:
        # Get user org
        user = await db.get(User, user_id)
        if not user or not user.organization_id:
            await websocket.send_json({"type": "error", "message": "No organization"})
            await websocket.close()
            return

        org_id = user.organization_id
        agent, keys, collection_name = await _get_agent_and_keys(
            UUID(agent_id), org_id, db
        )

    if agent is None:
        await websocket.send_json({"type": "error", "message": "Agent not found"})
        await websocket.close()
        return

    # Check for required keys
    llm_provider = agent.llm_provider or "openai"
    if llm_provider not in keys:
        await websocket.send_json({
            "type": "error",
            "message": f"No API key configured for {llm_provider}. Add it in Settings → API Keys.",
        })
        await websocket.close()
        return

    if "deepgram" not in keys:
        await websocket.send_json({
            "type": "error",
            "message": "No Deepgram API key configured. Add it in Settings → API Keys.",
        })
        await websocket.close()
        return

    # Build pipeline
    pipeline = VoicePipeline(
        model=agent.llm_model,
        system_prompt=agent.system_prompt,
        voice=agent.tts_voice,
        language=agent.language,
        collection_name=collection_name,
        provider=llm_provider,
        api_keys=keys,
    )

    await websocket.send_json({"type": "ready", "agent": agent.name})

    audio_buffer = bytearray()
    call_start = time.time()

    try:
        while True:
            message = await websocket.receive()

            if message.get("type") == "websocket.disconnect":
                break

            # Binary frame → audio chunk
            if "bytes" in message and message["bytes"]:
                audio_buffer.extend(message["bytes"])
                continue

            # Text frame → JSON command
            if "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type", "")

                if msg_type == "end_turn":
                    if len(audio_buffer) < 3200:  # < 0.1s of audio at 16kHz
                        audio_buffer.clear()
                        continue

                    # Wrap raw PCM in WAV header for Deepgram
                    pcm_data = bytes(audio_buffer)
                    wav_data = _wav_header(len(pcm_data)) + pcm_data
                    audio_buffer.clear()

                    try:
                        user_text, agent_text, audio_response = (
                            await pipeline.process_audio(wav_data)
                        )

                        # Send user transcript
                        await websocket.send_json({
                            "type": "transcript",
                            "role": "user",
                            "text": user_text,
                        })

                        # Send agent transcript
                        await websocket.send_json({
                            "type": "transcript",
                            "role": "assistant",
                            "text": agent_text,
                        })

                        # Send audio in chunks (8KB each)
                        chunk_size = 8192
                        for i in range(0, len(audio_response), chunk_size):
                            await websocket.send_bytes(
                                audio_response[i : i + chunk_size]
                            )

                        await websocket.send_json({"type": "audio_end"})

                    except Exception as exc:
                        logger.error("pipeline_error", error=str(exc))
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Processing error: {str(exc)[:200]}",
                        })

                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

                elif msg_type == "end_call":
                    break

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("voice_ws_error", error=str(exc))
    finally:
        duration = int(time.time() - call_start)
        logger.info(
            "voice_ws_disconnected",
            agent_id=agent_id,
            duration_seconds=duration,
        )
