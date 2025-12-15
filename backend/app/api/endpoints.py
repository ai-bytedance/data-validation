from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlmodel import Session, select
from ..core.db import get_session
from ..models.models import Dataset, DatasetBase, ExpectationSuite, ExpectationSuiteBase, ValidationRun
from ..services import gx_service, ai_service
from ..core.db_utils import get_db_preview # New utility we will create
import shutil
import os
import uuid
import json

router = APIRouter()

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

@router.get("/datasets/{dataset_id}", response_model=Dataset)
def read_dataset(dataset_id: str, session: Session = Depends(get_session)):
    dataset = session.get(Dataset, dataset_id)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

# --- Suites ---

@router.post("/suites", response_model=ExpectationSuite)
def create_suite(suite: ExpectationSuite, session: Session = Depends(get_session)):
    session.add(suite)
    session.commit()
    session.refresh(suite)
    return suite

@router.get("/suites", response_model=List[ExpectationSuite])
def read_suites(session: Session = Depends(get_session)):
    return session.exec(select(ExpectationSuite)).all()

# --- Validation Runs (History) ---

@router.post("/validate/{dataset_id}/{suite_id}", response_model=ValidationRun)
async def run_validation(dataset_id: str, suite_id: str, session: Session = Depends(get_session)):
    dataset = session.get(Dataset, dataset_id)
    suite = session.get(ExpectationSuite, suite_id)
    
    if not dataset or not suite:
        raise HTTPException(status_code=404, detail="Resource not found")
        
    # Run GX Logic
    try:
        raw_result = await gx_service.run_validation(dataset, suite)
    except Exception as e:
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
    return run

@router.get("/runs", response_model=List[ValidationRun])
def read_runs(session: Session = Depends(get_session)):
    return session.exec(select(ValidationRun).order_by(ValidationRun.run_time.desc())).all()

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
