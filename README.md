## Text-to-SQL App

### Configure database and LLM

Set environment variables (backend):

```
# Database (SQLAlchemy URL). Examples:
# postgresql+psycopg2://user:pass@host:5432/dbname
# mysql+pymysql://user:pass@host:3306/dbname
# sqlite:///path/to.db
DB_URL=

# Optional explicit dialect override: postgresql | mysql | sqlite
SQL_DIALECT=

# LLM provider and model
# LLM_PROVIDER=openai | ollama
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# Auth/JWT
SECRET_KEY=change-me
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

If using OpenAI, set `OPENAI_API_KEY`. If using Ollama, ensure the model is pulled and the server is running.

### Run backend

```
uvicorn backend.main:app --reload --port 8000
```

### Frontend

Start the Vite app in `frontend/`:

```
npm install
npm run dev
```

### Auth flow

- Register via POST `/auth/register` with `{ username, password }`
- Login via POST `/auth/login` to get `access_token`
- Send `Authorization: Bearer <token>` in POST `/query`

The UI now includes a login/register panel and stores the token in `localStorage`.

### Build your semantic layer with human-in-the-loop

1) Connect your DB by setting `DB_URL` and starting the backend.
2) Login in the UI. Use the Semantic Layer panel to:
   - Load Schema: introspects tables/columns/keys from your DB
   - Suggest: asks the LLM to propose a semantic layer with synonyms and metrics
   - Edit: tweak the JSON in-place
   - Save: persists the semantic layer in memory for this session (and used by the agent)

Optionally place a file at `backend/semantic_config.json` and use `/semantic/reload` to load it. You can set `SEMANTIC_LAYER_PATH` to customize the path.

### Data freshness

The UI shows a "Data Freshness" widget that, per table, displays:
- last-loaded timestamp (if a timestamp-like column exists)
- column used for freshness

Columns detected include any of: `updated_at, modified_at, created_at, ingested_at, _load_ts, _ingested_ts, _updated_at, timestamp, ts`.
