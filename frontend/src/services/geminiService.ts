
import { GoogleGenAI, Type } from "@google/genai";
import { Expectation, ExpectationType, Language, DbConnectionConfig, AiConfig } from "../types";
import { generateId } from "../utils";

const getAiClient = (apiKeyOverride?: string) => {
  // Use override if present, otherwise default to env var
  const apiKey = apiKeyOverride || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please configure it in settings or .env file.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateExpectationsFromData = async (
  csvHead: string,
  columns: string[],
  language: Language,
  aiConfig: AiConfig, // Accept config
  domainContext?: string
): Promise<Expectation[]> => {
  try {
    const ai = getAiClient(aiConfig.apiKey); // Pass the optional key

    const langInstruction = language === 'zh'
      ? 'Ensure the "description" field for each expectation is in Chinese (Simplified Chinese).'
      : 'Ensure the "description" field for each expectation is in English.';

    const domainInstruction = domainContext
      ? `THE DATA DOMAIN IS: "${domainContext}". \nIMPORTANT: Generate expectations that are SPECIFIC to this domain. For example, if the domain is 'Academic Papers', check for valid DOI formats using regex, publication years within reasonable ranges, or specific citation styles.`
      : '';

    const prompt = `
      You are a data quality expert using the Great Expectations library.
      Analyze this CSV sample (first few rows):
      
      ${csvHead}
      
      ${domainInstruction}

      Suggest 3 to 6 valid expectations for these columns: ${columns.join(', ')}.
      
      Focus on these types: 
      - expect_column_values_to_not_be_null
      - expect_column_values_to_be_unique
      - expect_column_values_to_be_between (for numbers)
      - expect_column_values_to_be_in_set (for categories)
      - expect_column_value_lengths_to_be_between (for fixed length codes)
      - expect_column_values_to_be_of_type (for strict type checks)
      - expect_table_row_count_to_be_between (if sample looks small or specific)
      - expect_column_values_to_match_strftime_format (for date strings)
      - expect_column_mean/min/max_to_be_between (for numeric stats)
      - expect_column_values_to_match_regex_match (CRITICAL: Use this for domain specific IDs like DOIs, ISBNs, Emails, etc.)
      
      Return JSON only.
      ${langInstruction}
    `;

    const modelName = aiConfig.modelName || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              column: { type: Type.STRING },
              type: {
                type: Type.STRING,
                enum: [
                  'expect_column_values_to_not_be_null',
                  'expect_column_values_to_be_unique',
                  'expect_column_values_to_be_between',
                  'expect_column_values_to_be_in_set',
                  'expect_column_values_to_match_regex_match',
                  'expect_column_value_lengths_to_be_between',
                  'expect_column_values_to_be_of_type',
                  'expect_table_row_count_to_be_between',
                  'expect_column_values_to_match_strftime_format',
                  'expect_column_mean_to_be_between',
                  'expect_column_min_to_be_between',
                  'expect_column_max_to_be_between',
                  'expect_column_values_to_match_ai_semantic_check'
                ]
              },
              kwargs: {
                type: Type.OBJECT,
                properties: {
                  min_value: { type: Type.NUMBER },
                  max_value: { type: Type.NUMBER },
                  value_set: { type: Type.ARRAY, items: { type: Type.STRING } },
                  regex: { type: Type.STRING },
                  type: { type: Type.STRING },
                  strftime_format: { type: Type.STRING },
                  prompt: { type: Type.STRING }
                }
              },
              description: { type: Type.STRING }
            },
            required: ['column', 'type', 'kwargs', 'description']
          }
        }
      }
    });

    const rawExpectations = JSON.parse(response.text || "[]");

    // Map to our internal ID structure
    return rawExpectations.map((ex: any) => ({
      ...ex,
      id: generateId(),
      // Ensure kwargs is clean
      kwargs: ex.kwargs || {}
    }));

  } catch (error) {
    console.error("Gemini suggestion failed:", error);
    return [];
  }
};

export const generatePythonCode = async (
  suiteName: string,
  expectations: Expectation[],
  dbConfig?: DbConnectionConfig,
  aiConfig?: AiConfig // Accept config for commenting in python code
): Promise<string> => {
  try {
    // Here we just use the default client to generate the code itself
    // But we might want to embed the configured key/model in the python script comments
    const ai = getAiClient(aiConfig?.apiKey);

    let dataSourcePrompt = `
            # Use Pandas Dataframe by default
            df = pd.read_csv('your_data.csv')
            context.sources.add_pandas(name="my_pandas_datasource").read_csv("data.csv")
        `;

    if (dbConfig) {
      dataSourcePrompt = `
            # The user has configured a REAL database connection.
            # Generate code using 'great_expectations' to connect to this SQL database:
            # Type: ${dbConfig.type}
            # Host: ${dbConfig.host}
            # Port: ${dbConfig.port}
            # Database: ${dbConfig.database}
            # Table: ${dbConfig.table}
            # Username: ${dbConfig.username}
            # Password: [PASSWORD] (Placeholder for security)

            # Use 'context.sources.add_sql' or equivalent modern GX API to configure the datasource.
            # Create a Batch Request for the table '${dbConfig.table}'.
            `;
    }

    const modelConfigNote = aiConfig && aiConfig.apiKey
      ? `# Note: User configured specific AI model: ${aiConfig.modelName}`
      : `# Note: Using default AI environment`;

    const prompt = `
            Generate a complete Python script using the 'great_expectations' library (GX 0.16+ style).
            
            SETUP:
            1. Import necessary modules (great_expectations, pandas, etc).
            2. Create a Data Context (get_context).
            
            DATA SOURCE:
            ${dataSourcePrompt}
            
            EXPECTATION SUITE:
            1. Create a suite named "${suiteName}".
            2. Add these expectations:
            ${JSON.stringify(expectations, null, 2)}

            IMPORTANT NOTE ON AI SEMANTIC CHECKS:
            If you see 'expect_column_values_to_match_ai_semantic_check', this is a custom expectation.
            In the python code, please generate a custom Expectation class or a simple row-by-row check using an LLM (commented out or mocked) 
            to demonstrate how one would implement this "Prompt Template" check in reality. 
            It should use the 'prompt' kwarg provided.
            ${modelConfigNote}
            
            VALIDATION:
            1. Create a Checkpoint.
            2. Run the checkpoint and print the results.
            
            Return the raw Python code. Do not wrap in markdown blocks.
        `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = response.text || "";
    text = text.replace(/```python/g, '').replace(/```/g, '');
    return text;
  } catch (error) {
    console.error("Code gen failed", error);
    return "# Error generating code. Please check API Key.";
  }
}
