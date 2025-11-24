FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY llm_proxy.py .

# Environment variables (can be overridden at runtime)
ENV PROXY_PORT=8080
ENV LETTA_BASE_URL=http://localhost:8283/v1
ENV LETTA_PASSWORD=""
ENV LETTA_AGENT_ID=""
ENV BUFFER_MAX_SIZE=1000
ENV BATCH_SIZE=10
ENV FLUSH_INTERVAL=5.0

EXPOSE 8080

CMD ["python", "llm_proxy.py"]
