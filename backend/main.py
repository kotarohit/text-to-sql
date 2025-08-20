import os
import sqlite3
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .langchain_agent import (
    generate_sql_response,
    get_semantic_layer,
    set_semantic_layer,
    reload_semantic_layer,
    suggest_semantic_layer_from_schema,
    save_semantic_layer_to_disk,
)
from passlib.context import CryptContext
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

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

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-prod")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
USERS_DB_PATH = os.getenv("USERS_DB_PATH", "backend/users.db")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class QueryRequest(BaseModel):
    question: str


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


def init_users_db() -> None:
    os.makedirs(os.path.dirname(USERS_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_username(authorization: Optional[str] = Header(default=None, alias="Authorization")) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization scheme")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return username


_engine: Optional[Engine] = None


def get_engine() -> Engine:
    global _engine
    if _engine is not None:
        return _engine

    db_url = os.getenv("DB_URL")
    if not db_url:
        dbname = os.getenv("PGDATABASE", "your_db_name")
        user = os.getenv("PGUSER", "your_user")
        password = os.getenv("PGPASSWORD", "your_password")
        host = os.getenv("PGHOST", "localhost")
        port = os.getenv("PGPORT", "5432")
        db_url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"

    _engine = create_engine(db_url, pool_pre_ping=True)
    return _engine


@app.on_event("startup")
def on_startup():
    init_users_db()


# Health check
@app.get("/")
def read_root():
    return {"message": "LLM SQL Backend is live"}


@app.post("/auth/register")
def register_user(payload: RegisterRequest):
    username = payload.username.strip().lower()
    if not username or not payload.password:
        raise HTTPException(status_code=400, detail="Username and password required")

    password_hash = get_password_hash(payload.password)
    try:
        conn = sqlite3.connect(USERS_DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
            (username, password_hash, datetime.utcnow().isoformat()),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Username already exists")
    finally:
        conn.close()

    return {"success": True}


@app.post("/auth/login", response_model=TokenResponse)
def login_user(payload: LoginRequest):
    username = payload.username.strip().lower()
    conn = sqlite3.connect(USERS_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()

    if not row or not verify_password(payload.password, row[0]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": username})
    return TokenResponse(access_token=token)


# Schema introspection & semantic layer endpoints
@app.get("/schema", dependencies=[Depends(get_current_username)])
def get_schema():
    # Introspect via SQLAlchemy inspector
    try:
        engine = get_engine()
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = {}
        for table_name in inspector.get_table_names():
            columns = [
                {"name": col["name"], "type": str(col["type"]) }
                for col in inspector.get_columns(table_name)
            ]
            pk_cols = inspector.get_pk_constraint(table_name).get("constrained_columns", [])
            fks = []
            for fk in inspector.get_foreign_keys(table_name):
                fks.append({
                    "constrained_columns": fk.get("constrained_columns", []),
                    "referred_table": fk.get("referred_table"),
                    "referred_columns": fk.get("referred_columns", []),
                })
            tables[table_name] = {
                "columns": columns,
                "primary_key": pk_cols,
                "foreign_keys": fks,
            }
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SemanticUpdateRequest(BaseModel):
    semantic_layer: dict


@app.post("/semantic/suggest", dependencies=[Depends(get_current_username)])
def semantic_suggest(schema: dict):
    try:
        suggested = suggest_semantic_layer_from_schema(schema)
        return {"suggested": suggested}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/semantic", dependencies=[Depends(get_current_username)])
def semantic_get():
    return get_semantic_layer()


@app.post("/semantic", dependencies=[Depends(get_current_username)])
def semantic_set(payload: SemanticUpdateRequest):
    set_semantic_layer(payload.semantic_layer)
    return {"success": True}


@app.post("/semantic/reload", dependencies=[Depends(get_current_username)])
def semantic_reload():
    layer = reload_semantic_layer()
    return {"success": True, "semantic_layer": layer}


@app.post("/semantic/save", dependencies=[Depends(get_current_username)])
def semantic_save():
    try:
        path = save_semantic_layer_to_disk()
        return {"success": True, "path": path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/freshness", dependencies=[Depends(get_current_username)])
def freshness():
    """Compute simple freshness per table using max timestamp-like column if present."""
    engine = get_engine()
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    freshness_info = []
    timestamp_candidates = {"updated_at", "modified_at", "created_at", "ingested_at", "_load_ts", "_ingested_ts", "_updated_at", "timestamp", "ts"}
    with engine.connect() as conn:
        for table in tables:
            cols = [c["name"].lower() for c in inspector.get_columns(table)]
            chosen = None
            for c in cols:
                if c in timestamp_candidates:
                    chosen = c
                    break
            last_loaded = None
            if chosen:
                try:
                    q = text(f"SELECT MAX({chosen}) AS last_ts FROM {table}")
                    res = conn.execute(q).fetchone()
                    last_loaded = res[0] if res else None
                except Exception:
                    last_loaded = None
            freshness_info.append({
                "table": table,
                "timestamp_column": chosen,
                "last_loaded": str(last_loaded) if last_loaded is not None else None,
            })
    return {"freshness": freshness_info}

# Main endpoint
@app.post("/query")
def query_db(request: QueryRequest, username: str = Depends(get_current_username)):
    try:
        question = request.question
        result = generate_sql_response(question)

        if result["type"] == "error":
            return {
                "success": True,
                "response": result
            }

        sql = result["sql"]

        engine = get_engine()
        with engine.connect() as conn:
            result_proxy = conn.execute(text(sql))
            colnames = list(result_proxy.keys())
            rows = [list(row) for row in result_proxy.fetchall()]

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
    