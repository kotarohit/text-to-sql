import os
import json
from typing import Optional

from dotenv import load_dotenv
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

# LLM providers (imported lazily in get_llm)
# OpenAI
try:
    from langchain.chat_models import ChatOpenAI  # langchain < 0.2
except Exception:  # pragma: no cover
    ChatOpenAI = None  # type: ignore
try:
    from langchain_openai import ChatOpenAI as ChatOpenAINew  # langchain-openai package
except Exception:
    ChatOpenAINew = None  # type: ignore

# Ollama
try:
    from langchain_community.chat_models import ChatOllama
except Exception:
    ChatOllama = None  # type: ignore

load_dotenv()

SEMANTIC_LAYER_PATH = os.getenv("SEMANTIC_LAYER_PATH", "backend/semantic_config.json")
semantic_layer: dict = {"tables": {}}

def _load_semantic_layer_from_disk() -> dict:
    global semantic_layer
    try:
        with open(SEMANTIC_LAYER_PATH) as f:
            semantic_layer = json.load(f)
    except FileNotFoundError:
        semantic_layer = {"tables": {}}
    return semantic_layer

def format_semantic_layer(semantic_layer: dict) -> str:
    formatted = []
    for table, config in semantic_layer["tables"].items():
        columns = ", ".join(config["columns"].keys())
        metrics = ", ".join(config.get("metrics", {}).keys())
        formatted.append(f"Table: {table}\nColumns: {columns}")
        if metrics:
            formatted.append(f"Metrics: {metrics}")
    return "\n\n".join(formatted)

semantic_knowledge = format_semantic_layer(_load_semantic_layer_from_disk())

def infer_sql_dialect() -> str:
    # Priority: explicit env, then DB_URL scheme, fallback to postgresql
    env_dialect = os.getenv("SQL_DIALECT")
    if env_dialect:
        return env_dialect.lower()

    db_url = os.getenv("DB_URL", "")
    if db_url:
        # Examples: postgresql+psycopg2://, mysql+pymysql://, sqlite:///path.db
        scheme = db_url.split("://", 1)[0]
        # Strip driver suffix
        dialect = scheme.split("+")[0].lower()
        return dialect

    return "postgresql"


def get_llm():
    provider = os.getenv("LLM_PROVIDER", "openai").lower()
    model = os.getenv("LLM_MODEL") or (
        "gpt-4o-mini" if provider == "openai" else "llama3.1"
    )

    if provider == "openai":
        # Prefer new integration if available
        if ChatOpenAINew is not None:
            return ChatOpenAINew(model=model, temperature=0)
        if ChatOpenAI is not None:
            return ChatOpenAI(model=model, temperature=0)
        raise RuntimeError("OpenAI integration not available; install langchain-openai or compatible langchain.")

    if provider == "ollama":
        if ChatOllama is None:
            raise RuntimeError("Ollama integration not available; install langchain-community and run Ollama.")
        base_url = os.getenv("OLLAMA_BASE_URL")
        kwargs = {"model": model, "temperature": 0}
        if base_url:
            kwargs["base_url"] = base_url
        return ChatOllama(**kwargs)

    # Placeholder for other providers; users can extend
    raise RuntimeError(f"Unsupported LLM provider: {provider}")

# Prompt Template
custom_prompt = PromptTemplate(
    input_variables=["question", "table_info", "dialect"],
    template="""
You are an expert SQL generator for the {dialect} dialect. Use the following semantic layer info to generate accurate SQL.

Semantic Layer Info:
{table_info}

Question: {question}

Guidelines:
- Unless required by the dialect, do not quote identifiers
- Prefer lowercase for table/column names when possible
- Return only valid SQL for the declared dialect: {dialect}
- Do NOT include explanation or formatting

SQL:
"""
)

# SQL generation chain
sql_chain: Optional[LLMChain] = None

def generate_sql_response(question: str) -> dict:
    try:
        global sql_chain
        if sql_chain is None:
            llm = get_llm()
            sql_chain = LLMChain(
                llm=llm,
                prompt=custom_prompt,
                verbose=True
            )

        output = sql_chain.invoke({
            "question": question,
            "table_info": semantic_knowledge,
            "dialect": infer_sql_dialect()
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


def get_semantic_layer() -> dict:
    return semantic_layer


def set_semantic_layer(new_layer: dict) -> None:
    global semantic_layer, semantic_knowledge
    semantic_layer = new_layer or {"tables": {}}
    semantic_knowledge = format_semantic_layer(semantic_layer)


def reload_semantic_layer() -> dict:
    new_layer = _load_semantic_layer_from_disk()
    set_semantic_layer(new_layer)
    return semantic_layer


def suggest_semantic_layer_from_schema(db_schema: dict) -> dict:
    """
    Given a schema like { tables: { table: { columns: [{name, type}], primary_key: [], foreign_keys: [] } } },
    ask the LLM to propose a semantic layer with synonyms and candidate metrics.
    """
    llm = get_llm()
    prompt = PromptTemplate(
        input_variables=["schema", "dialect"],
        template="""
You are an analytics engineer. Based on the following database schema and SQL dialect, propose a compact semantic layer in JSON with the structure:
{
  "tables": {
    "<table>": {
      "columns": {
        "<column>": ["synonym1", "synonym2"]
      },
      "metrics": {
        "<metric_name>": "<SQL aggregation expression using this table>"
      }
    }
  }
}

Rules:
- Only output valid JSON. Do not include markdown fences or explanations.
- Prefer intuitive synonyms for business users.
- For numeric columns, propose a few useful SUM/AVG metrics where it makes sense.
- Use the {dialect} dialect when writing metric SQL expressions (no schema qualifiers).

Schema:
{schema}
""",
    )

    chain = LLMChain(llm=llm, prompt=prompt, verbose=False)
    raw = chain.invoke({
        "schema": json.dumps(db_schema, indent=2),
        "dialect": infer_sql_dialect(),
    })
    text = raw.get("text", "").strip()
    # Clean common wrappers
    if text.startswith("```"):
        text = text.strip("`\n ")
        if text.lower().startswith("json"):
            text = text[4:].strip()
    try:
        proposed = json.loads(text)
        # minimal validation
        if not isinstance(proposed, dict) or "tables" not in proposed:
            raise ValueError("Invalid shape")
        return proposed
    except Exception:
        # Fallback minimal layer based on schema
        fallback = {"tables": {}}
        for table, tdef in db_schema.get("tables", {}).items():
            cols = {c["name"]: [] for c in tdef.get("columns", [])}
            fallback["tables"][table] = {"columns": cols, "metrics": {}}
        return fallback


def save_semantic_layer_to_disk(path: Optional[str] = None) -> str:
    target_path = path or SEMANTIC_LAYER_PATH
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "w") as f:
        json.dump(semantic_layer, f, indent=2)
    return target_path
