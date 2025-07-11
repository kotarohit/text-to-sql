from langchain.chat_models import ChatOpenAI
from langchain.chains import SQLDatabaseChain
from langchain.sql_database import SQLDatabase
from sqlalchemy import create_engine
import config

def get_db_connection():
    db_uri = f"postgresql+psycopg2://{config.DB_USER}:{config.DB_PASSWORD}@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"
    engine = create_engine(db_uri)
    return SQLDatabase(engine)

def get_langchain_response(question: str) -> str:
    db = get_db_connection()
    llm = ChatOpenAI(temperature=0, model_name="gpt-3.5-turbo", openai_api_key=config.OPENAI_API_KEY)
    db_chain = SQLDatabaseChain.from_llm(llm, db, verbose=True)
    return db_chain.run(question)