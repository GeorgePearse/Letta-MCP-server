#!/usr/bin/env python3
"""
LLM API Proxy with Async Letta Memory Storage

This proxy sits between any LLM client (Claude Code, OpenCode, Cursor, etc.) and the
LLM API (Anthropic, OpenAI), transparently capturing all conversations and storing
them in Letta for persistent memory - without adding latency to your interactions.

Architecture:
    Client (Claude Code, etc.)
            ↓
    localhost:8080 (this proxy)
            ↓
    api.anthropic.com / api.openai.com
            ↓ (async, non-blocking)
    Letta Memory Storage

Key Features:
- Zero latency impact: writes happen in background queue
- Works with any LLM client that supports custom base URLs
- Captures both user messages and assistant responses
- Handles streaming responses (SSE)
- Resilient: local buffer if Letta is temporarily unavailable
"""

import asyncio
import json
import os
import time
import uuid
from datetime import datetime
from typing import Optional
from collections import deque

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager

# ============================================================================
# Configuration
# ============================================================================

# LLM API Configuration
ANTHROPIC_BASE_URL = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com")

# Letta Configuration
LETTA_BASE_URL = os.getenv("LETTA_BASE_URL", "http://localhost:8283/v1")
LETTA_PASSWORD = os.getenv("LETTA_PASSWORD", "")
LETTA_AGENT_ID = os.getenv("LETTA_AGENT_ID", "")  # Agent to store memories in

# Proxy Configuration
PROXY_PORT = int(os.getenv("PROXY_PORT", "8080"))
BUFFER_MAX_SIZE = int(os.getenv("BUFFER_MAX_SIZE", "1000"))  # Max items in memory buffer
BATCH_SIZE = int(os.getenv("BATCH_SIZE", "10"))  # Items per batch write
FLUSH_INTERVAL = float(os.getenv("FLUSH_INTERVAL", "5.0"))  # Seconds between flushes

# ============================================================================
# Memory Buffer & Writer
# ============================================================================

class MemoryBuffer:
    """
    Thread-safe buffer for storing memories before writing to Letta.
    Provides resilience if Letta is temporarily unavailable.
    """

    def __init__(self, max_size: int = BUFFER_MAX_SIZE):
        self.buffer: deque = deque(maxlen=max_size)
        self.failed_writes: deque = deque(maxlen=max_size)
        self._lock = asyncio.Lock()
        self.stats = {
            "total_queued": 0,
            "total_written": 0,
            "total_failed": 0,
            "dropped_overflow": 0,
        }

    async def add(self, memory: dict):
        """Add a memory to the buffer."""
        async with self._lock:
            if len(self.buffer) >= self.buffer.maxlen:
                self.stats["dropped_overflow"] += 1
            self.buffer.append(memory)
            self.stats["total_queued"] += 1

    async def get_batch(self, size: int) -> list:
        """Get a batch of memories from the buffer."""
        async with self._lock:
            batch = []
            for _ in range(min(size, len(self.buffer))):
                batch.append(self.buffer.popleft())
            return batch

    async def return_failed(self, memories: list):
        """Return failed writes to retry later."""
        async with self._lock:
            for memory in memories:
                self.failed_writes.append(memory)
                self.stats["total_failed"] += 1

    async def mark_written(self, count: int):
        """Mark memories as successfully written."""
        async with self._lock:
            self.stats["total_written"] += count

    async def get_stats(self) -> dict:
        """Get buffer statistics."""
        async with self._lock:
            return {
                **self.stats,
                "pending": len(self.buffer),
                "failed_pending_retry": len(self.failed_writes),
            }


# Global buffer instance
memory_buffer = MemoryBuffer()


async def letta_writer():
    """
    Background task that continuously writes memories to Letta.
    Runs independently of request handling to avoid blocking.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        headers = {}
        if LETTA_PASSWORD:
            headers["Authorization"] = f"Bearer {LETTA_PASSWORD}"

        while True:
            try:
                # Get batch of memories to write
                batch = await memory_buffer.get_batch(BATCH_SIZE)

                if batch and LETTA_AGENT_ID:
                    success_count = 0
                    failed = []

                    for memory in batch:
                        try:
                            # Format memory as structured text
                            text = format_memory_for_letta(memory)

                            # Write to Letta archival memory
                            response = await client.post(
                                f"{LETTA_BASE_URL}/agents/{LETTA_AGENT_ID}/archival",
                                json={"text": text},
                                headers=headers,
                            )

                            if response.status_code in (200, 201):
                                success_count += 1
                            else:
                                print(f"Letta write failed: {response.status_code} - {response.text}")
                                failed.append(memory)

                        except Exception as e:
                            print(f"Error writing to Letta: {e}")
                            failed.append(memory)

                    if success_count > 0:
                        await memory_buffer.mark_written(success_count)

                    if failed:
                        await memory_buffer.return_failed(failed)

                # Wait before next batch
                await asyncio.sleep(FLUSH_INTERVAL)

            except Exception as e:
                print(f"Letta writer error: {e}")
                await asyncio.sleep(FLUSH_INTERVAL)


def format_memory_for_letta(memory: dict) -> str:
    """
    Format a memory entry for storage in Letta.
    Creates structured, searchable text.
    """
    timestamp = memory.get("timestamp", datetime.now().isoformat())
    role = memory.get("role", "unknown")
    session_id = memory.get("session_id", "unknown")
    model = memory.get("model", "unknown")

    # Build structured memory text
    lines = [
        f"[{timestamp}]",
        f"Session: {session_id}",
        f"Model: {model}",
        f"Role: {role.upper()}",
        "---",
    ]

    content = memory.get("content", "")
    if isinstance(content, list):
        # Handle structured content (like Anthropic's content blocks)
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text":
                    lines.append(block.get("text", ""))
                elif block.get("type") == "tool_use":
                    lines.append(f"[Tool Call: {block.get('name', 'unknown')}]")
                    lines.append(f"Input: {json.dumps(block.get('input', {}), indent=2)}")
                elif block.get("type") == "tool_result":
                    lines.append(f"[Tool Result for: {block.get('tool_use_id', 'unknown')}]")
                    lines.append(str(block.get("content", "")))
            else:
                lines.append(str(block))
    else:
        lines.append(str(content))

    return "\n".join(lines)


# ============================================================================
# Request/Response Processing
# ============================================================================

def extract_messages_from_request(body: bytes, provider: str) -> list[dict]:
    """Extract messages from an LLM API request body."""
    try:
        data = json.loads(body)
        messages = []

        model = data.get("model", "unknown")
        session_id = str(uuid.uuid4())[:8]  # Short session ID

        # Extract messages array
        for msg in data.get("messages", []):
            messages.append({
                "timestamp": datetime.now().isoformat(),
                "session_id": session_id,
                "model": model,
                "provider": provider,
                "role": msg.get("role", "unknown"),
                "content": msg.get("content", ""),
            })

        return messages
    except Exception as e:
        print(f"Error extracting messages: {e}")
        return []


def extract_response_content(body: bytes, provider: str, is_streaming: bool = False) -> Optional[dict]:
    """Extract assistant response from LLM API response."""
    try:
        if is_streaming:
            # For streaming, we'll handle this differently
            return None

        data = json.loads(body)

        # Anthropic format
        if provider == "anthropic":
            content = data.get("content", [])
            return {
                "timestamp": datetime.now().isoformat(),
                "session_id": "response",
                "model": data.get("model", "unknown"),
                "provider": provider,
                "role": "assistant",
                "content": content,
                "usage": data.get("usage", {}),
            }

        # OpenAI format
        elif provider == "openai":
            choices = data.get("choices", [])
            if choices:
                message = choices[0].get("message", {})
                return {
                    "timestamp": datetime.now().isoformat(),
                    "session_id": "response",
                    "model": data.get("model", "unknown"),
                    "provider": provider,
                    "role": message.get("role", "assistant"),
                    "content": message.get("content", ""),
                    "usage": data.get("usage", {}),
                }

        return None
    except Exception as e:
        print(f"Error extracting response: {e}")
        return None


async def capture_streaming_response(response: httpx.Response, provider: str) -> tuple:
    """
    Capture and forward a streaming response, accumulating content for memory storage.
    Returns (accumulated_content, async_generator).
    """
    accumulated_text = []
    accumulated_tool_calls = []
    model = "unknown"

    async def forward_and_capture():
        nonlocal model
        async for chunk in response.aiter_bytes():
            yield chunk

            # Try to parse SSE data
            try:
                chunk_str = chunk.decode("utf-8")
                for line in chunk_str.split("\n"):
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            continue
                        data = json.loads(data_str)

                        # Anthropic streaming format
                        if provider == "anthropic":
                            if data.get("type") == "message_start":
                                model = data.get("message", {}).get("model", model)
                            elif data.get("type") == "content_block_delta":
                                delta = data.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    accumulated_text.append(delta.get("text", ""))

                        # OpenAI streaming format
                        elif provider == "openai":
                            if "model" in data:
                                model = data["model"]
                            choices = data.get("choices", [])
                            if choices:
                                delta = choices[0].get("delta", {})
                                if "content" in delta:
                                    accumulated_text.append(delta["content"])
            except Exception:
                pass  # Ignore parsing errors in streaming

    return {
        "model": model,
        "text": accumulated_text,
        "tool_calls": accumulated_tool_calls,
    }, forward_and_capture()


# ============================================================================
# FastAPI Application
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - starts background writer."""
    # Start the background Letta writer
    writer_task = asyncio.create_task(letta_writer())
    print(f"LLM Proxy started on port {PROXY_PORT}")
    print(f"Letta agent ID: {LETTA_AGENT_ID or 'NOT CONFIGURED'}")
    yield
    # Cleanup
    writer_task.cancel()
    try:
        await writer_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="LLM Proxy with Letta Memory",
    description="Transparent proxy that captures all LLM interactions to Letta",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    """Health check endpoint with buffer statistics."""
    stats = await memory_buffer.get_stats()
    return {
        "status": "healthy",
        "letta_configured": bool(LETTA_AGENT_ID),
        "letta_base_url": LETTA_BASE_URL,
        "buffer_stats": stats,
    }


@app.get("/stats")
async def stats():
    """Detailed statistics about memory capture."""
    return await memory_buffer.get_stats()


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy(request: Request, path: str):
    """
    Main proxy endpoint - forwards requests to appropriate LLM API
    and captures conversations for Letta storage.
    """
    # Determine which provider based on path or headers
    provider = determine_provider(request, path)
    base_url = ANTHROPIC_BASE_URL if provider == "anthropic" else OPENAI_BASE_URL

    # Get request body
    body = await request.body()

    # Queue user messages for Letta (non-blocking)
    if request.method == "POST" and body:
        messages = extract_messages_from_request(body, provider)
        for msg in messages:
            await memory_buffer.add(msg)

    # Forward headers (excluding host)
    forward_headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length")
    }

    # Make request to actual API
    async with httpx.AsyncClient(timeout=120.0) as client:
        url = f"{base_url}/{path}"

        response = await client.request(
            method=request.method,
            url=url,
            headers=forward_headers,
            content=body,
            params=request.query_params,
        )

        # Check if streaming response
        content_type = response.headers.get("content-type", "")
        is_streaming = "text/event-stream" in content_type

        if is_streaming:
            # Handle streaming response
            accumulated, stream_gen = await capture_streaming_response(response, provider)

            async def streaming_wrapper():
                async for chunk in stream_gen:
                    yield chunk

                # After stream completes, queue the accumulated response
                if accumulated["text"]:
                    await memory_buffer.add({
                        "timestamp": datetime.now().isoformat(),
                        "session_id": "streaming_response",
                        "model": accumulated["model"],
                        "provider": provider,
                        "role": "assistant",
                        "content": "".join(accumulated["text"]),
                    })

            return StreamingResponse(
                streaming_wrapper(),
                status_code=response.status_code,
                headers={k: v for k, v in response.headers.items() if k.lower() != "content-encoding"},
                media_type=content_type,
            )
        else:
            # Handle non-streaming response
            response_body = response.content

            # Queue assistant response for Letta (non-blocking)
            if request.method == "POST":
                response_memory = extract_response_content(response_body, provider)
                if response_memory:
                    await memory_buffer.add(response_memory)

            return Response(
                content=response_body,
                status_code=response.status_code,
                headers={k: v for k, v in response.headers.items() if k.lower() != "content-encoding"},
                media_type=content_type,
            )


def determine_provider(request: Request, path: str) -> str:
    """Determine which LLM provider to use based on request."""
    # Check for explicit header
    provider_header = request.headers.get("x-llm-provider", "").lower()
    if provider_header in ("anthropic", "openai"):
        return provider_header

    # Check path patterns
    if "anthropic" in path.lower() or path.startswith("v1/messages"):
        return "anthropic"
    if "openai" in path.lower() or path.startswith("v1/chat"):
        return "openai"

    # Check for Anthropic-specific headers
    if "anthropic-version" in request.headers:
        return "anthropic"

    # Default to Anthropic (Claude)
    return "anthropic"


# ============================================================================
# Main Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("LLM Proxy with Letta Memory Storage")
    print("=" * 60)
    print(f"Proxy Port: {PROXY_PORT}")
    print(f"Anthropic Base: {ANTHROPIC_BASE_URL}")
    print(f"OpenAI Base: {OPENAI_BASE_URL}")
    print(f"Letta Base: {LETTA_BASE_URL}")
    print(f"Letta Agent: {LETTA_AGENT_ID or 'NOT SET - memories will be buffered but not stored'}")
    print("=" * 60)
    print()
    print("To use with Claude Code:")
    print(f"  export ANTHROPIC_BASE_URL=http://localhost:{PROXY_PORT}")
    print()
    print("To use with OpenAI-compatible tools:")
    print(f"  export OPENAI_BASE_URL=http://localhost:{PROXY_PORT}")
    print()

    uvicorn.run(app, host="0.0.0.0", port=PROXY_PORT)
