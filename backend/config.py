import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL config
DB_HOST = "localhost"
DB_PORT = 6543
DB_NAME = "semantic"
DB_USER = "admin"
DB_PASSWORD = "admin"

# LangChain model (choose one)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # If using OpenAI
# VERTEXAI_PROJECT = os.getenv("VERTEXAI_PROJECT")  # If using Vertex