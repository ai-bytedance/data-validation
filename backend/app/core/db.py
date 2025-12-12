from sqlmodel import SQLModel, Session, create_engine
from .config import settings

# Use SQLite for simplicity in this demo. 
# In production, swap with PostgreSQL based on settings.
connect_args = {"check_same_thread": False}
engine = create_engine(settings.DATABASE_URL, echo=True, connect_args=connect_args)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
