import pandas as pd
from sqlalchemy import create_engine

print("✅ Script is running")

# Connect to your local Postgres DB
engine = create_engine("postgresql+psycopg2://admin:admin@localhost:6543/semantic")

# Example query: get top 5 rows from revenue
query = "SELECT * FROM revenue LIMIT 10;"

# Read and print
df = pd.read_sql(query, engine)
print("✅ Query result:")
print(df)