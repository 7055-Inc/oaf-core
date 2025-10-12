#!/bin/bash

echo "🎨 [LEO-TRUTH] Starting Truth ChromaDB server..."

# Set environment variables
export CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]'
export CHROMA_SERVER_HOST="0.0.0.0"
export CHROMA_SERVER_HTTP_PORT="8001"

# Create data directory if it doesn't exist
mkdir -p /var/www/main/leo/data/truth-chroma

echo "🎨 [LEO-TRUTH-CHROMA] ChromaDB data directory: /var/www/main/leo/data/truth-chroma"
echo "🎨 [LEO-TRUTH-CHROMA] ChromaDB port: 8001"
echo "🎨 [LEO-TRUTH-CHROMA] Starting Truth ChromaDB server..."

# Start ChromaDB server using virtual environment
cd /var/www/main/leo
source venv/bin/activate
python -m chromadb.cli.cli run --host 0.0.0.0 --port 8001 --path ./data/truth-chroma &

CHROMA_PID=$!
echo "✅ [LEO-TRUTH-CHROMA] Truth ChromaDB server started successfully (PID: $CHROMA_PID)"
echo "✅ [LEO-TRUTH-CHROMA] Server running at: http://localhost:8001"

# Save PID for management
echo $CHROMA_PID > /var/www/main/leo/data/truth-chroma.pid

# Wait a moment for server to start
sleep 2

# Test if server is responding
if curl -s "http://localhost:8001/api/v2/heartbeat" > /dev/null; then
    echo "✅ [LEO-TRUTH-CHROMA] Truth ChromaDB server is responding"
else
    echo "❌ [LEO-TRUTH-CHROMA] Truth ChromaDB server failed to start properly"
fi
