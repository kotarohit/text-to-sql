import pandas as pd
from sqlalchemy import create_engine

# Connect to PostgreSQL (port 6543 since 5432 was blocked)
engine = create_engine("postgresql+psycopg2://admin:admin@localhost:6543/semantic")

# Map CSV file names to table names
csv_table_map = {
    "branch.csv": "branch",
    "country.csv": "country",
    "date.csv": "date",
    "dealer.csv": "dealer",
    "procduct.csv": "product",
    "revenue.csv": "revenue"
}

for file, table in csv_table_map.items():
    print(f"📥 Loading {file} → {table}")
    df = pd.read_csv(f"../../data/processed/{file}")
    df.to_sql(table, engine, if_exists='append', index=False)
    print(f"✅ Loaded {len(df)} rows into '{table}'")