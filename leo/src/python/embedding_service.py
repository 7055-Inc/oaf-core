#!/usr/bin/env python3
"""
Leo AI Platform - Embedding Service
Generates embeddings using Sentence Transformers
"""

import sys
import json
import numpy as np
from sentence_transformers import SentenceTransformer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmbeddingGenerator:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.model_name = model_name
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load the sentence transformer model"""
        try:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise e
    
    def generate_embedding(self, text):
        """Generate embedding for a single text"""
        try:
            if not self.model:
                raise Exception("Model not loaded")
            
            embedding = self.model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise e
    
    def generate_batch_embeddings(self, texts):
        """Generate embeddings for multiple texts"""
        try:
            if not self.model:
                raise Exception("Model not loaded")
            
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            raise e

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        generator = EmbeddingGenerator()
        
        if command == "single":
            if len(sys.argv) < 3:
                print(json.dumps({"error": "No text provided"}))
                sys.exit(1)
            
            text = sys.argv[2]
            embedding = generator.generate_embedding(text)
            
            result = {
                "success": True,
                "embedding": embedding,
                "dimension": len(embedding),
                "model": generator.model_name
            }
            print(json.dumps(result))
            
        elif command == "batch":
            # Read texts from stdin
            input_data = sys.stdin.read()
            data = json.loads(input_data)
            
            if "texts" not in data:
                print(json.dumps({"error": "No texts provided"}))
                sys.exit(1)
            
            texts = data["texts"]
            embeddings = generator.generate_batch_embeddings(texts)
            
            result = {
                "success": True,
                "embeddings": embeddings,
                "count": len(embeddings),
                "dimension": len(embeddings[0]) if embeddings else 0,
                "model": generator.model_name
            }
            print(json.dumps(result))
            
        elif command == "test":
            # Test embedding generation
            test_text = "This is a test sentence for embedding generation."
            embedding = generator.generate_embedding(test_text)
            
            result = {
                "success": True,
                "test": "passed",
                "dimension": len(embedding),
                "model": generator.model_name
            }
            print(json.dumps(result))
            
        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))
        sys.exit(1)

if __name__ == "__main__":
    main()
