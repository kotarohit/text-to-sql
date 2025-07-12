import os
import psycopg2
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .langchain_agent import generate_sql_response

app = FastAPI()

# Enable CORS so frontend can talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8501",
        "http://localhost:5173",
        "https://text-to-sql-ko.netlify.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request schema
class QueryRequest(BaseModel):
    question: str

# Health check
@app.get("/")
def read_root():
    return {"message": "LLM SQL Backend is live"}

# Main endpoint
@app.post("/query")
def query_db(request: QueryRequest):
    try:
        question = request.question
        result = generate_sql_response(question)

        if result["type"] == "error":
            return {
                "success": True,
                "response": result
            }

        sql = result["sql"]
        
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            dbname=os.getenv("PGDATABASE", "your_db_name"),
            user=os.getenv("PGUSER", "your_user"),
            password=os.getenv("PGPASSWORD", "your_password"),
            host=os.getenv("PGHOST", "localhost"),
            port=os.getenv("PGPORT", "5432"),
        )
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        colnames = [desc[0] for desc in cursor.description]

        cursor.close()
        conn.close()

        return {
            "success": True,
            "response": {
                "type": "query_result",
                "sql": sql,
                "columns": colnames,
                "rows": rows
            }
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
    