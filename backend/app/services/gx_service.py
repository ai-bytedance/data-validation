import great_expectations as gx 
from great_expectations.core.batch import BatchRequest
from great_expectations.core.expectation_configuration import ExpectationConfiguration
import pandas as pd
import os
from typing import List, Dict, Any
from ..models.models import Dataset, ExpectationSuite
from . import ai_service
import asyncio
import time

# Using Ephemeral Context for simpler dynamic setup
context = gx.get_context(mode="ephemeral")

async def run_validation(dataset: Dataset, suite: ExpectationSuite) -> Dict[str, Any]:
    datasource_name = "dynamic_datasource"
    # Use unique name to avoid 'Asset already exists' error in ephemeral context
    data_asset_name = f"asset_{dataset.id}_{int(time.time()*1000)}"
    suite_name = f"suite_{suite.id}"
    
    # Separation of Concerns
    standard_expectations = []
    ai_expectations = []
    
    for exp in suite.expectations:
        if exp["type"] == "expect_column_values_to_match_ai_semantic_check":
            ai_expectations.append(exp)
        else:
            standard_expectations.append(exp)

    # 1. Setup Standard Suite in Context
    try:
        gx_suite = context.add_or_update_expectation_suite(expectation_suite_name=suite_name)
    except:
        # Fallback if add_or_update not available in this version or fails
        gx_suite = context.create_expectation_suite(expectation_suite_name=suite_name, overwrite_existing=True)
        
    # 2. Add Expectations
    # suite.expectations is a list of dicts: { "type": "...", "kwargs": {...}, "column": "..." }
    for exp_data in standard_expectations:
        kwargs = exp_data.get("kwargs", {}).copy() # Copy to avoid mutating original dict
        if "column" in exp_data:
            kwargs["column"] = exp_data["column"]
            
        config = ExpectationConfiguration(
            expectation_type=exp_data["type"],
            kwargs=kwargs
        )
        gx_suite.add_expectation(config)
    
    context.save_expectation_suite(gx_suite)

    # 3. Setup Datasource & Batch Request
    batch_request = None
    
    if dataset.file_path and os.path.exists(dataset.file_path):
        # Pandas / File approach
        # In Ephemeral context, simplest is to read into Pandas and use RuntimeBatchRequest 
        # OR add a Pandas Datasource dynamically.
        
        # Let's read file manually for maximum control in this POC
        df = pd.read_csv(dataset.file_path)
        
        datasource_name = "runtime_pandas"
        if datasource_name not in context.datasources:
             context.sources.add_pandas(datasource_name)
        
        ds = context.get_datasource(datasource_name)
        
        # With unique asset name, we don't need to check for existence/delete
        # Explicitly add asset and build batch request to ensure we get a BatchRequest object, not a Validator
        asset = ds.add_dataframe_asset(name=data_asset_name, dataframe=df)
        batch_request = asset.build_batch_request()
        
    elif dataset.db_config:
        # SQL Approach
        db_type = dataset.db_config.get("type", "").lower()
        if "postgres" in db_type:
             driver = "postgresql+psycopg2"
        elif "mysql" in db_type:
             driver = "mysql+pymysql"
        elif "sqlite" in db_type:
             driver = "sqlite"
        # ... add others as needed
        else:
             driver = "postgresql+psycopg2" # Default fallback
             
        # Construct Connection String
        # url = "driver://user:pass@host:port/db"
        user = dataset.db_config.get("username")
        password = dataset.db_config.get("password")
        host = dataset.db_config.get("host")
        port = dataset.db_config.get("port")
        db = dataset.db_config.get("database")
        table_name = dataset.db_config.get("table", "unknown_table")
        
        if driver == "sqlite":
            # Just for local testing if needed, though usually file based
            connection_string = f"sqlite:///{host}" 
        else:
            connection_string = f"{driver}://{user}:{password}@{host}:{port}/{db}"

        datasource_name = f"sql_source_{dataset.id}"
        if datasource_name not in context.datasources:
            context.sources.add_sql(
                name=datasource_name,
                connection_string=connection_string,
            )
            
        # Add Asset (Table)
        datasource = context.get_datasource(datasource_name)
        # Check if asset exists, if not add it
        try:
             datasource.get_asset(table_name)
        except LookupError:
             datasource.add_table_asset(name=table_name, table_name=table_name)
             
        batch_request = datasource.get_asset(table_name).build_batch_request()
        
    else:
        raise ValueError("Dataset has no data source config")

    # 4. Run Checkpoint (Standard)
    checkpoint_name = f"ckpt_{suite.id}"
    
    # If we have 0 standard expectations, we might skip this or run empty for stats
    # If we have 0 standard expectations, we might skip this or run empty for stats
    if standard_expectations:
        # Define Checkpoint without runtime data (batch_request cannot be pickled)
        checkpoint = context.add_or_update_checkpoint(
            name=checkpoint_name,
            expectation_suite_name=suite_name
        )
        try:
            # Pass runtime data (batch_request) directly to run()
            results = checkpoint.run(
                validations=[
                    {
                        "batch_request": batch_request,
                        "expectation_suite_name": suite_name,
                    }
                ]
            )
            result_dict = results.to_json_dict()
        except Exception as e:
            import traceback
            traceback.print_exc()
            # Return a synthetic failure result so the frontend can display it
            result_dict = {
                "success": False,
                "run_results": {
                    "error": {
                        "validation_result": {
                            "success": False,
                            "statistics": {
                                "success": False,
                                "success_percent": 0.0,
                                "observed_value": f"Critical Validation Error: {str(e)}"
                            }
                        }
                    }
                }
            }
    else:
        # Minimal empty result structure
        result_dict = {"run_results": {}, "success": True}

    # 5. Run AI Expectations (Manual)
    if ai_expectations and batch_request:
        # We need validation result structure for these.
        # 1. Get data
        # For Pandas:
        validator = context.get_validator(batch_request=batch_request, expectation_suite_name=suite_name)
        df_head = validator.head(n=1000) # Get top rows for AI check
        
        # We need to construct a robust result merging
        # For simplicity in this POC, we append results to the 'run_results' blob or log errors
        
        for exp in ai_expectations:
            col = exp["kwargs"].get("column")
            prompt = exp["kwargs"].get("prompt", "Is valid")
            
            if col and col in df_head.columns:
                values = df_head[col].tolist()
                validation_map = await ai_service.validate_batch_with_ai(values, prompt)
                
                # Assess success
                # This is super naive - in real world we'd create a proper ValidationResult object
                failures = [v for v in values if not validation_map.get(str(v), False)]
                success = len(failures) == 0
                
                # Mock a result structure to inject back
                ai_res_key = f"ai_validation_{col}"
                result_dict.setdefault("run_results", {})[ai_res_key] = {
                    "validation_result": {
                        "success": success,
                        "statistics": {
                            "success": success,
                            "success_percent": 100.0 if success else 0.0,
                            "observed_value": f"AI Checked: {len(failures)} failures"
                        },
                        "meta": {"ai_prompt": prompt}
                    }
                }

    return result_dict
