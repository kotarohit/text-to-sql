import os
import json
from langchain_community.utilities.sql_database import SQLDatabase
from langchain.chat_models import ChatOpenAI
from langchain_experimental.sql import SQLDatabaseChain
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
from langchain.chains import LLMChain

load_dotenv()

# Load semantic layer
with open("backend/semantic_config.json") as f:
    semantic_layer = json.load(f)

def format_semantic_layer(semantic_layer: dict) -> str:
    formatted = []
    for table, config in semantic_layer["tables"].items():
        columns = ", ".join(config["columns"].keys())
        metrics = ", ".join(config.get("metrics", {}).keys())
        formatted.append(f"Table: {table}\nColumns: {columns}")
        if metrics:
            formatted.append(f"Metrics: {metrics}")
    return "\n\n".join(formatted)

semantic_knowledge = format_semantic_layer(semantic_layer)

# Connect to PostgreSQL
db = SQLDatabase.from_uri("postgresql+psycopg2://admin:admin@localhost:6543/semantic")

# LLM
llm = ChatOpenAI(model="gpt-4", temperature=0)

# Prompt Template
custom_prompt = PromptTemplate(
    input_variables=["question", "table_info", "dialect"],
    template="""
You are a Postgres SQL expert. Use the following semantic layer info to generate accurate SQL.

Semantic Layer Info:
{table_info}

Question: {question}

Guidelines:
- Do NOT wrap table or column names in double quotes
- Use lowercase for all table and column names
- Return only valid SQL (PostgreSQL dialect)
- Do NOT include explanation or formatting

SQL:
"""
)

# SQL generation chain
sql_chain = LLMChain(
    llm=llm,
    prompt=custom_prompt,
    verbose=True
)

def generate_sql_response(question: str) -> dict:
    try:
        output = sql_chain.invoke({
            "question": question,
            "table_info": semantic_knowledge,
            "dialect": "postgresql"
        })

        sql = output.get("text", "").strip().strip("```sql").strip("```").strip()
        if not sql:
            return {"type": "error", "error": "Failed to generate SQL."}

        # Just return SQL string
        return {
            "type": "query_result",
            "sql": sql
        }

    except Exception as e:
        return {"type": "error", "error": str(e)}
