print("✅ Script is running")
import pandas as pd
from sqlalchemy import create_engine

# Connect to your Postgres DB
engine = create_engine("postgresql+psycopg2://admin:admin@localhost:6543/semantic")

# Run a test query
query = "SELECT * FROM revenue LIMIT 5;"
df = pd.read_sql(query, engine)

# Make sure to print!
print(df)