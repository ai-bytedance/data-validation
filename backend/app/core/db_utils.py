
from typing import Dict, Any, List
from sqlalchemy import create_engine, text
import pandas as pd

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
    
    if "sqlite" in db_type:
        driver = "sqlite"
        if host:
            url = f"sqlite:///{host}"
        else:
            url = f"sqlite:///{db}" # Fallback
    elif "postgres" in db_type:
        url = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db}"
    elif "mysql" in db_type:
        url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{db}"
    elif "sql server" in db_type or "mssql" in db_type:
        # frequent driver: pymssql or pyodbc
        try:
            import pymssql
            url = f"mssql+pymssql://{user}:{password}@{host}:{port}/{db}"
        except ImportError:
            raise Exception("SQL Server driver (pymssql) not installed on backend.")
    elif "oracle" in db_type:
        try:
            import cx_Oracle
            url = f"oracle+cx_oracle://{user}:{password}@{host}:{port}/{db}"
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
            # Safe query for standard SQL
            query = text(f"SELECT * FROM {table} LIMIT 5")
            df = pd.read_sql(query, conn)
            
            return {
                "headers": df.columns.tolist(),
                "rows": df.where(pd.notnull(df), None).to_dict(orient='records')
            }
    except Exception as e:
        raise e
