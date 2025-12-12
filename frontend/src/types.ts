
export interface DbConnectionConfig {
  type: 'MySQL' | 'PostgreSQL' | 'Hive' | 'Neo4j' | 'MongoDB' | 'Oracle' | 'SQL Server' | 'SQLite';
  host: string;
  port: string;
  database: string;
  username: string;
  password?: string;
  table: string;
}

export type AiProvider = 'gemini' | 'openai' | 'deepseek' | 'alibaba' | 'claude' | 'custom';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  modelName: string;
  baseUrl?: string; // Critical for OpenAI-compatible providers (DeepSeek, etc.)
}

export interface Dataset {
  id: string;
  name: string;
  headers: string[];
  rows: Record<string, any>[];
  rawCsv: string;
  file_path?: string;
  dbConfig?: DbConnectionConfig;
}

export enum ExpectationType {
  NOT_NULL = 'expect_column_values_to_not_be_null',
  UNIQUE = 'expect_column_values_to_be_unique',
  BETWEEN = 'expect_column_values_to_be_between',
  IN_SET = 'expect_column_values_to_be_in_set',
  REGEX = 'expect_column_values_to_match_regex_match',
  LENGTH_BETWEEN = 'expect_column_value_lengths_to_be_between',
  OF_TYPE = 'expect_column_values_to_be_of_type',
  TABLE_ROW_COUNT = 'expect_table_row_count_to_be_between',
  DATE_FORMAT = 'expect_column_values_to_match_strftime_format',
  MEAN_BETWEEN = 'expect_column_mean_to_be_between',
  MIN_BETWEEN = 'expect_column_min_to_be_between',
  MAX_BETWEEN = 'expect_column_max_to_be_between',
  AI_SEMANTIC = 'expect_column_values_to_match_ai_semantic_check',
}

export interface Expectation {
  id: string;
  column: string;
  type: ExpectationType;
  kwargs: Record<string, any>;
  description?: string;
}

export interface ExpectationSuite {
  id: string;
  name: string;
  expectations: Expectation[];
}

export interface ValidationResult {
  id: string;
  suiteName: string;
  runTime: string;
  success: boolean;
  score: number;
  results: {
    expectationId: string;
    success: boolean;
    observedValue: any;
    unexpectedCount: number;
    unexpectedPercent: number;
    unexpectedList?: any[]; // Stores sample failed values
  }[];
}

export type ViewState = 'DASHBOARD' | 'DATA_SOURCE' | 'SUITE_BUILDER' | 'VALIDATION_RUNNER' | 'REPORTS';

export type Language = 'zh' | 'en';
