from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_agent.py import get_langchain_response

app = FastAPI()

class QueryRequest(BaseModel):
    question: str

@app.get("/")
def read_root():
    return {"message": "LangChain Data Assistant is up!"}

@app.post("/ask")
def ask_question(request: QueryRequest):
    try:
        result = get_langchain_response(request.question)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))