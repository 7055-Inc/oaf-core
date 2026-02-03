#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🎨 [LEO-TRUTH] Starting Truth ChromaDB server..."

# Set environment variables
export CHROMA_SERVER_CORS_ALLOW_ORIGINS='["*"]'
export CHROMA_SERVER_HOST="0.0.0.0"
export CHROMA_SERVER_HTTP_PORT="${TRUTH_CHROMA_PORT:-8001}"

# Create data directory if it doesn't exist
mkdir -p "${SCRIPT_DIR}/data/truth-chroma"

echo "🎨 [LEO-TRUTH-CHROMA] ChromaDB data directory: ${SCRIPT_DIR}/data/truth-chroma"
echo "🎨 [LEO-TRUTH-CHROMA] ChromaDB port: ${TRUTH_CHROMA_PORT:-8001}"
echo "🎨 [LEO-TRUTH-CHROMA] Starting Truth ChromaDB server..."

# Start ChromaDB server using virtual environment
cd "${SCRIPT_DIR}"
source venv/bin/activate
python -m chromadb.cli.cli run --host 0.0.0.0 --port ${TRUTH_CHROMA_PORT:-8001} --path ./data/truth-chroma

# Note: Running in foreground for PM2 to manage
