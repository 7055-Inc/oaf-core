#!/bin/bash

echo "🎨 [LEO] Starting ChromaDB server..."

# Set environment variables
export CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]'
export CHROMA_SERVER_HOST="0.0.0.0"
export CHROMA_SERVER_HTTP_PORT="8000"

# Create data directory if it doesn't exist
mkdir -p /var/www/main/leo/data/chroma

echo "🎨 [LEO-CHROMA] ChromaDB data directory: /var/www/main/leo/data/chroma"
echo "🎨 [LEO-CHROMA] ChromaDB port: 8000"
echo "🎨 [LEO-CHROMA] Starting ChromaDB server..."

# Start ChromaDB server using virtual environment
cd /var/www/main/leo
source venv/bin/activate
python -m chromadb.cli.cli run --host 0.0.0.0 --port 8000 --path ./data/chroma &

CHROMA_PID=$!
echo "✅ [LEO-CHROMA] ChromaDB server started successfully (PID: $CHROMA_PID)"
echo "✅ [LEO-CHROMA] Server running at: http://localhost:8000"

# Wait a moment for server to start
sleep 2

# Test if server is responding
if curl -s "http://localhost:8000/api/v1/heartbeat" > /dev/null; then
    echo "✅ [LEO-CHROMA] ChromaDB server is responding"
else
    echo "❌ [LEO-CHROMA] ChromaDB server failed to start properly"
fi
