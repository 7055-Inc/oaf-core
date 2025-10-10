#!/bin/bash

# Leo AI Platform Setup Script
# Automated setup for the Leo AI system

set -e

echo "🎨 [LEO] Setting up Leo AI Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}🎨 [LEO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ [LEO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️  [LEO]${NC} $1"
}

print_error() {
    echo -e "${RED}❌ [LEO]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the leo directory"
    exit 1
fi

# Check Node.js version
print_status "Checking Node.js version..."
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js 16 or higher is required. Current version: $(node --version)"
    exit 1
fi
print_success "Node.js version OK: $(node --version)"

# Check Python version
print_status "Checking Python version..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
print_success "Python version OK: $(python3 --version)"

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm install
print_success "Node.js dependencies installed"

# Install Python dependencies
print_status "Installing Python dependencies..."
if command -v pip3 &> /dev/null; then
    pip3 install -r requirements.txt
    print_success "Python dependencies installed"
else
    print_warning "pip3 not found. Please install Python dependencies manually:"
    print_warning "pip3 install -r requirements.txt"
fi

# Create necessary directories
print_status "Creating directories..."
mkdir -p data/chroma
mkdir -p logs
print_success "Directories created"

# Set up environment file template
if [ ! -f ".env" ]; then
    print_status "Creating .env template..."
    cat > .env << EOL
# Leo AI Platform Configuration
PORT=3003

# Database Configuration (update with your credentials)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=oaf_media

# ChromaDB Configuration
CHROMA_DB_PATH=./data/chroma

# Optional: OpenAI API Key (for future enhancements)
# OPENAI_API_KEY=your_openai_key

# Logging Level
LOG_LEVEL=info
EOL
    print_success ".env template created - please update with your database credentials"
else
    print_warning ".env file already exists - skipping template creation"
fi

# Test Python embedding service
print_status "Testing Python embedding service..."
if python3 src/python/embedding_service.py test > /dev/null 2>&1; then
    print_success "Python embedding service test passed"
else
    print_warning "Python embedding service test failed - check dependencies"
fi

# Make scripts executable
chmod +x setup.sh

print_success "Leo AI Platform setup completed!"
echo ""
print_status "Next steps:"
echo "1. Update the .env file with your database credentials"
echo "2. Start the server: npm start"
echo "3. Initialize the system: curl -X POST http://localhost:3003/api/system/initialize"
echo "4. Run data ingestion: curl -X POST http://localhost:3003/api/system/ingest"
echo "5. Test the system: curl -X POST http://localhost:3003/api/system/test"
echo ""
print_status "API Endpoints:"
echo "• Health Check: GET /api/system/health"
echo "• System Status: GET /api/system/status"
echo "• Vector Search: POST /api/vector/search"
echo "• AI Recommendations: POST /api/learning/recommendations"
echo "• Smart Search: POST /api/learning/smart-search"
echo ""
print_success "🎨 Leo AI Platform is ready to power your art platform!"
