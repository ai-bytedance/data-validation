from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlmodel import Session, select
from pydantic import BaseModel
from ..core.db import get_session
from ..models.models import Dataset, DatasetBase, ExpectationSuite, ExpectationSuiteBase, ValidationRun
from ..services import gx_service, ai_service
from ..core.db_utils import get_db_preview # New utility we will create
import shutil
import os
import uuid
import json
from datetime import datetime

router = APIRouter()

# --- Response Models ---

class ValidationResultItem(BaseModel):
    expectationId: str
    success: bool
    observedValue: Any
    unexpectedCount: int
    unexpectedPercent: float
    unexpectedList: Optional[List[Any]] = []
    expectationConfig: Optional[Dict[str, Any]] = None

class ValidationRunResponse(BaseModel):
    id: str
    suiteName: str
    runTime: datetime
    success: bool
    score: float
    results: List[ValidationResultItem]

def parse_gx_result(raw_result: Dict[str, Any]) -> List[ValidationResultItem]:
    """Parses raw Great Expectations JSON result into frontend-friendly flattened list."""
    items = []
    try:
        run_results = raw_result.get("run_results", {})
        # There should be one validation ID key
        for _, val_res in run_results.items():
            results_list = val_res.get("validation_result", {}).get("results", [])
            
            for res in results_list:
                # Expectation Config
                exp_config = res.get("expectation_config", {})
                kwargs = exp_config.get("kwargs", {})
                exp_type = exp_config.get("expectation_type", "unknown")
                
                # Result
                result_info = res.get("result", {})
                success = res.get("success", False)
                
                # Extract Observed Value
                observed_val = result_info.get("observed_value")
                
                # Note: We used to set a string "X failures" here, but satisfied it to Frontend to handle via unexpectedList

                # Extract ID / Description
                # Use 'column' + 'type' as ID or explicit expectation ID
                col = kwargs.get("column", "table")
                exp_id = f"{col}.{exp_type}"

                items.append(ValidationResultItem(
                    expectationId=exp_id,
                    success=success,
                    observedValue=str(observed_val) if observed_val is not None else "N/A",
                    unexpectedCount=result_info.get("unexpected_count", 0),
                    unexpectedPercent=result_info.get("unexpected_percent", 0.0),
                    unexpectedList=result_info.get("partial_unexpected_list", []),
                    expectationConfig=kwargs
                ))
    except Exception as e:
        print(f"Error parsing GX result: {e}")
    return items

# --- Datasets ---

@router.post("/datasets", response_model=Dataset)
def create_dataset(dataset: Dataset, session: Session = Depends(get_session)):
    # If it is a DB dataset, try to fetch schema metadata automatically
    if dataset.db_config:
        try:
            preview = get_db_preview(dataset.db_config)
            # We can store this in the dataset metadata or just confirm it works
            # For this simplified model, we might just want to ensure we CAN connect.
            # But the user wants REAL data. 
            # We will return the preview data in a transient way or save it if we expanded the model.
            # For now, let's attach it to the response if the client needs it (client sends request, gets response with data).
            # But response_model is Dataset. We might need to expand Dataset model or update the client to fetch preview separately.
            # Let's assume validation of connection is enough here, and we add a preview endpoint.
            pass
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to connect to database: {str(e)}")

    session.add(dataset)
    session.commit()
    session.refresh(dataset)
    return dataset

@router.post("/datasets/preview")
def preview_dataset(dataset: Dataset):
    """Stateless preview of a potential dataset config"""
    if dataset.file_path and os.path.exists(dataset.file_path):
        import pandas as pd
        try:
            df = pd.read_csv(dataset.file_path, nrows=5)
            return {
                "headers": df.columns.tolist(),
                "rows": df.where(pd.notnull(df), None).to_dict(orient='records')
            }
        except:
             return {"headers": [], "rows": []}
             
    elif dataset.db_config:
        try:
            return get_db_preview(dataset.db_config)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return {"headers": [], "rows": []}

@router.get("/datasets", response_model=List[Dataset])
def read_datasets(session: Session = Depends(get_session)):
    return session.exec(select(Dataset)).all()

@router.get("/datasets/{dataset_id}")
def read_dataset(dataset_id: str, session: Session = Depends(get_session)):
    dataset = session.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Hydrate preview data if file exists
    if dataset.file_path and os.path.exists(dataset.file_path):
        import pandas as pd
        try:
            df = pd.read_csv(dataset.file_path, nrows=5)
            # Create a new object or attach attributes if pydantic allows extra fields,
            # but response_model=Dataset might strip them if not defined in schema.
            # However, Dataset (Pydantic/SQLModel) doesn't have headers/rows fields in models.py.
            # We need to rely on the fact that FastAPI returns the object as JSON.
            # BUT wait, the SQLModel definition in models.py DOES NOT have headers/rows.
            # The Frontend Dataset interface in types.ts DOES.
            # If we return 'dataset' as is, it lacks headers/rows.
            # We must either add non-table fields to the Model or use a specific Response Model.
            # For simplicity in this fix, let's just make sure the frontend can handle it? 
            # No, Frontend types expect 'rows'.
            
            # Since we can't easily change the SQLModel definition without migration or re-def,
            # We will use the fact that Python objects can have dynamic attributes,
            # BUT Pydantic response_model will filter them out if not in the model.
            
            # HACK: We should ideally update the Pydantic model. 
            # But let's check `backend/app/models/models.py`: 
            # It inherits from DatasetBase.
            # If we assign `dataset.rows = ...`, Pydantic v2 might ignore it during serialization if not in fields.
            
            # Let's try to return a dict representing the dataset + extra fields, 
            # or rely on the frontend fetching PREVIEW separately?
            # The user wants "Click -> Preview".
            
            # Best approach: Add `headers` and `rows` as Optional fields to `Dataset` model in `models.py` 
            # with `Field(default=None, sa_column_kwargs={"exclude": True})` or just not `table=True`?
            # Actually, `Dataset` is `table=True`. Adding fields requires migration if they are columns.
            # We can subclass it for response: `DatasetRead`?
            
            # LET'S DO THIS: 
            # 1. We will NOT change the model now to avoid migration issues in this session.
            # 2. We will change the endpoint logic to return a dynamic dict and remove `response_model=Dataset` 
            #    or use a loose response model.
            #    Actually, removing `response_model` allows returning any dict.
            
            pass
        except:
             pass
             
    # For now, let's try populating it and assume we verify `models.py` can accept ignored fields?
    # No, SQLModel is strict.
    
    # STRATEGY CHANGE: I will update `read_dataset` to return a `dict` merging the DB object and the file content.
    # I will remove `response_model=Dataset` from the decorator to allow the extra fields.
    
    response_data = dataset.model_dump()
    response_data["headers"] = []
    response_data["rows"] = []
    
    if dataset.file_path and os.path.exists(dataset.file_path):
        import pandas as pd
        try:
            df = pd.read_csv(dataset.file_path, nrows=5)
            # Fill NaN with None for JSON compliance
            df_clean = df.where(pd.notnull(df), None)
            response_data["headers"] = df.columns.tolist()
            response_data["rows"] = df_clean.to_dict(orient='records')
        except Exception as e:
            print(f"Preview fetch error: {e}")

    return response_data

@router.delete("/datasets/{dataset_id}")
def delete_dataset(dataset_id: str, hard_delete: bool = True, session: Session = Depends(get_session)):
    dataset = session.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Optional: Delete physical file
    if hard_delete and dataset.file_path and os.path.exists(dataset.file_path):
        try:
            os.remove(dataset.file_path)
        except OSError as e:
            # We log but proceed with DB deletion so we don't get stuck
            print(f"Error deleting file {dataset.file_path}: {e}")
            
    # Cascade delete is handled by SQLModel/SQLAlchemy if configured, 
    # but here we might need to manually delete suites/runs if cascade isn't set up perfectly in SQLite.
    # For now, let's assume simple deletion of dataset is the goal.
    session.delete(dataset)
    session.commit()
    return {"ok": True}

# --- Suites ---

@router.post("/suites", response_model=ExpectationSuite)
def create_suite(suite: ExpectationSuite, session: Session = Depends(get_session)):
    # Fix for SQLite DateTime issue (if Pydantic passes string)
    if isinstance(suite.created_at, str):
        try:
            # Handle standard ISO format
            suite.created_at = datetime.fromisoformat(suite.created_at)
        except:
             # Fallback to now if parse fails
             suite.created_at = datetime.utcnow()

    # Use merge to allow updates (upsert)
    session.merge(suite)
    session.commit()
    # refresh requires the instance to be in session, merge returns a new instance
    # but for simple return we can just return the input suite or strictly:
    # merged_instance = session.merge(suite); session.commit(); session.refresh(merged_instance); return merged_instance
    # But simply returning suite is fine as we trust the merge.
    # Actually, let's do it properly:
    saved_suite = session.merge(suite)
    session.commit()
    session.refresh(saved_suite)
    return saved_suite

@router.get("/suites", response_model=List[ExpectationSuite])
def read_suites(session: Session = Depends(get_session)):
    return session.exec(select(ExpectationSuite)).all()

# --- Validation Runs (History) ---

@router.post("/validate/{dataset_id}/{suite_id}", response_model=ValidationRunResponse)
async def run_validation(dataset_id: str, suite_id: str, session: Session = Depends(get_session)):
    dataset = session.get(Dataset, dataset_id)
    suite = session.get(ExpectationSuite, suite_id)
    
    if not dataset or not suite:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    # Run GX Logic
    try:
        raw_result = await gx_service.run_validation(dataset, suite)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
    # Parse Result for Summary
    # The structure of raw_result depends on GX version, typically:
    # { "run_results": { "val_id": { "validation_result": { "statistics": { "success_percent": ... } } } } }
    
    success = True
    score = 0.0
    
    # Naive parsing for MVP
    try:
        run_results = raw_result.get("run_results", {})
        for key, val in run_results.items():
            stats = val.get("validation_result", {}).get("statistics", {})
            success = stats.get("success", False)
            score = stats.get("success_percent", 0.0)
            
            # Enforce consistency: if score is 100%, it must be a success
            if score == 100.0:
                success = True

            break 
    except:
        pass

    run = ValidationRun(
        suite_id=suite.id,
        success=success,
        score=score,
        result_json=raw_result
    )
    
    session.add(run)
    session.commit()
    session.refresh(run)
    
    return ValidationRunResponse(
        id=run.id,
        suiteName=suite.name,
        runTime=run.run_time,
        success=run.success,
        score=run.score,
        results=parse_gx_result(raw_result)
    )

@router.get("/runs", response_model=List[ValidationRunResponse])
def read_runs(session: Session = Depends(get_session)):
    runs = session.exec(select(ValidationRun).order_by(ValidationRun.run_time.desc())).all()
    res = []
    for r in runs:
        s_name = "Unknown"
        try:
            if r.suite:
                s_name = r.suite.name
        except:
            pass
            
        res.append(ValidationRunResponse(
            id=r.id,
            suiteName=s_name,
            runTime=r.run_time,
            # Fix historical data display: if score is 100, show as success even if DB says False
            success=r.success or r.score == 100.0,
            score=r.score,
            results=parse_gx_result(r.result_json)
        ))
    return res

@router.delete("/runs/{run_id}")
def delete_run(run_id: str, session: Session = Depends(get_session)):
    run = session.get(ValidationRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    session.delete(run)
    session.commit()
    return {"ok": True}

# --- Uploads ---

@router.post("/upload")
def upload_file(file: UploadFile = File(...)):
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    
    # Generate unique name
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{ext}"
    file_path = f"data/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Validation / Preview Logic
    import pandas as pd
    try:
        df = pd.read_csv(file_path, nrows=5)
        headers = df.columns.tolist()
        rows = df.to_dict(orient='records')
    except Exception as e:
        print(f"Error parsing CSV: {e}")
        headers = []
        rows = []
        
    return {
        "filename": file.filename, 
        "file_path": file_path,
        "headers": headers,
        "sample_rows": rows
    }

# --- AI & Code ---

@router.post("/suggest_expectations")
async def suggest_expectations(
    dataset_id: str = Body(...),
    session: Session = Depends(get_session)
):
    dataset = session.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Read Sample Data (e.g. from CSV file)
    sample_data = ""
    columns = []
    
    if dataset.file_path and os.path.exists(dataset.file_path):
        import pandas as pd
        df = pd.read_csv(dataset.file_path, nrows=10) # Minimal read
        sample_data = df.to_csv(index=False)
        columns = df.columns.tolist()
    else:
        # Fallback for DB or missing file
        sample_data = "No data preview available"
        columns = ["col1", "col2"]

    # Call AI Service (We need to expand ai_service to handle suggestion prompt)
    # Ideally I should have moved generateExpectationsFromData logic to ai_service.py too.
    # For now, I'll inline the prompting logic or call a generic prompt.
    
    prompt = f"""
      You are a data quality expert using Great Expectations.
      Analyze this CSV sample:
      {sample_data}
      
      Suggest 3-5 valid expectations for columns: {", ".join(columns)}.
      Return JSON: Array of objects with properties: column, type, kwargs, description.
      Use standard types: expect_column_values_to_not_be_null, expect_column_values_to_be_unique, etc.
    """
    
    # Simple list prompt
    # Note: validate_batch_with_ai meant for validation map. 
    # I should add a general 'generate_content' to ai_service.
    
    # Temporary direct usage for speed, refactor later
    try:
        import google.generativeai as genai
        from ..core.config import settings
        if settings.GEMINI_API_KEY:
             model = genai.GenerativeModel('gemini-2.0-flash')
             resp = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
             return json.loads(resp.text)
    except Exception as e:
        print(e)
        return []
    return []

@router.post("/generate_code")
async def generate_code(suite_id: str = Body(...), session: Session = Depends(get_session)):
    suite = session.get(ExpectationSuite, suite_id)
    if not suite:
        raise HTTPException(status_code=404, detail="Suite not found")
        
    # Simple boilerplate generation
    expectations_json = json.dumps(suite.expectations, indent=2)
    
    code = f"""
import great_expectations as gx

# 1. Setup Context
context = gx.get_context()

# 2. Add Expectation Suite
suite_name = "{suite.name}"
suite = context.add_or_update_expectation_suite(expectation_suite_name=suite_name)

# 3. Add Expectations
expectations = {expectations_json}

for exp in expectations:
    config = {{ "expectation_type": exp["type"], "kwargs": exp.get("kwargs", {{}}) }}
    suite.add_expectation(gx.core.expectation_configuration.ExpectationConfiguration(**config))

context.save_expectation_suite(suite)

# 4. Validate (Example)
# df = pd.read_csv("data.csv")
# validator = context.sources.add_pandas("my_pd").read_dataframe(df)
# res = validator.validate(expectation_suite=suite)
# print(res)
"""
    return {"code": code}
