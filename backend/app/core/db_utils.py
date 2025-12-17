
from typing import Dict, Any, List
from sqlalchemy import create_engine, text
import pandas as pd
from urllib.parse import quote_plus

def get_db_preview(db_config: Dict[str, Any]) -> Dict[str, Any]:
    # Construct connection string (reuse logic or centralize it)
    # Similar to gx_service logic, should probably extract to a common util
    
    db_type = db_config.get("type", "").lower()
    host = db_config.get("host")
    port = db_config.get("port")
    user = db_config.get("username")
    password = db_config.get("password")
    db = db_config.get("database")
    table = db_config.get("table")
    
    # URL encode username and password to handle special characters
    user_encoded = quote_plus(user) if user else ""
    password_encoded = quote_plus(password) if password else ""
    
    if "sqlite" in db_type:
        driver = "sqlite"
        # SQLite requires a file path (in host or database field)
        db_file = host or db
        if not db_file or db_file.strip() == "":
            raise Exception("SQLite requires a database file path. Please specify the file path in the 'Host' or 'Database' field.")
        url = f"sqlite:///{db_file}"
    elif "postgres" in db_type:
        url = f"postgresql+psycopg2://{user_encoded}:{password_encoded}@{host}:{port}/{db}"
    elif "mysql" in db_type:
        url = f"mysql+pymysql://{user_encoded}:{password_encoded}@{host}:{port}/{db}"
    elif "sql server" in db_type or "mssql" in db_type:
        # frequent driver: pymssql or pyodbc
        try:
            import pymssql
            url = f"mssql+pymssql://{user_encoded}:{password_encoded}@{host}:{port}/{db}"
        except ImportError:
            raise Exception("SQL Server driver (pymssql) not installed on backend.")
    elif "oracle" in db_type:
        try:
            import cx_Oracle
            url = f"oracle+cx_oracle://{user_encoded}:{password_encoded}@{host}:{port}/{db}"
        except ImportError:
            raise Exception("Oracle driver (cx_Oracle) not installed on backend.")
    elif "hive" in db_type:
         raise Exception("Hive support is currently experimental and requires 'pyhive'.")
    elif "neo4j" in db_type:
         raise Exception("Neo4j (Graph DB) is not supported via SQL preview yet.")
    elif "mongodb" in db_type:
         raise Exception("MongoDB (NoSQL) is not supported via SQL preview yet.")
    else:
        raise Exception(f"Unsupported database type: {db_type}")
        
    engine = create_engine(url)
    
    try:
        with engine.connect() as conn:
            # If no table specified, just test the connection
            if not table or table.strip() == "":
                # For SQLite, verify the file exists by attempting a simple query
                if "sqlite" in db_type:
                    # Try to list tables to verify the database file is valid
                    try:
                        conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1"))
                    except Exception as e:
                        raise Exception(f"SQLite database file is invalid or cannot be accessed: {str(e)}")
                
                # Connection successful, return empty preview
                return {
                    "headers": [],
                    "rows": []
                }
            
            # Safe query for standard SQL
            query = text(f"SELECT * FROM {table} LIMIT 5")
            df = pd.read_sql(query, conn)
            
            return {
                "headers": df.columns.tolist(),
                "rows": df.where(pd.notnull(df), None).to_dict(orient='records')
            }
    except Exception as e:
        raise e
