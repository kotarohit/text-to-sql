import pandas as pd
from sqlalchemy import create_engine

# ✅ Connect to your local Postgres DB
engine = create_engine("postgresql+psycopg2://admin:admin@localhost:6543/semantic")

# ✅ Read queries from file
with open("/Users/rohithkota/Desktop/All_projects/text-to-sql/notebooks/sql_queries/basic_queries.sql", "r") as file:
    sql_content = file.read()

# ✅ Split queries based on semicolon (assumes one query per block)
queries = [q.strip() for q in sql_content.split(";") if q.strip()]

# ✅ Show menu of available queries
print("✅ Available Queries:")
for i, query in enumerate(queries):
    preview = query.replace("\n", " ")[:80] + "..."
    print(f"{i+1}. {preview}")

# ✅ Prompt user for selection
try:
    selected = int(input("\n🔢 Enter query number to run (1–{}): ".format(len(queries))))
    if not (1 <= selected <= len(queries)):
        raise ValueError("Invalid number")

    chosen_query = queries[selected - 1]
    print("\n🚀 Running selected query...\n")
    df = pd.read_sql(chosen_query, engine)
    print("✅ Query result:")
    print(df)

except Exception as e:
    print(f"❌ Error: {e}")