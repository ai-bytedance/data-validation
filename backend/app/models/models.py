from typing import Optional, List, Dict, Any
from sqlmodel import Field, SQLModel, Relationship, JSON
from uuid import UUID, uuid4
from datetime import datetime

# --- Shared Enums/Types mirrored from frontend types.ts ---
# We can use StrEnum in Python 3.11+, using simple strings for compatibility for now

class DbConnectionConfig(SQLModel):
    type: str # MySQL, PostgreSQL, etc
    host: str
    port: str
    database: str
    username: str
    password: Optional[str] = None
    table: str

# --- Models ---

class DatasetBase(SQLModel):
    name: str
    # If it's a file upload
    file_path: Optional[str] = None
    # If it's a DB connection
    db_config: Optional[Dict[str, Any]] = Field(default=None, sa_type=JSON) 

class Dataset(DatasetBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    suites: List["ExpectationSuite"] = Relationship(back_populates="dataset", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class ExpectationSuiteBase(SQLModel):
    name: str
    dataset_id: str = Field(foreign_key="dataset.id")

class ExpectationSuite(ExpectationSuiteBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Store expectations as a JSON blob for simplicity, 
    # as GX expectations structure is complex and variable.
    # In a stricter schema, we would normalize this, but for this project JSON is fine.
    expectations: List[Dict[str, Any]] = Field(default=[], sa_type=JSON) 

    dataset: Dataset = Relationship(back_populates="suites")
    validation_runs: List["ValidationRun"] = Relationship(back_populates="suite", sa_relationship_kwargs={"cascade": "all, delete-orphan"})


class ValidationRunBase(SQLModel):
    suite_id: str = Field(foreign_key="expectationsuite.id")
    success: bool
    score: float
    # Stores the full JSON result from Great Expectations
    result_json: Dict[str, Any] = Field(default={}, sa_type=JSON)

class ValidationRun(ValidationRunBase, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    run_time: datetime = Field(default_factory=datetime.utcnow)
    
    suite: ExpectationSuite = Relationship(back_populates="validation_runs")
