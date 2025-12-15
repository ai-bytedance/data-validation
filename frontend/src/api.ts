import { Dataset, ExpectationSuite, ValidationResult, DbConnectionConfig } from '../types';

const API_BASE = '/api/v1';

export const api = {
    async uploadFile(file: File): Promise<{ filename: string, file_path: string, headers: string[], sample_rows: any[] }> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
    },

    async createDataset(dataset: Partial<Dataset>): Promise<Dataset> {
        const res = await fetch(`${API_BASE}/datasets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataset)
        });
        if (!res.ok) throw new Error('Failed to create dataset');
        const d = await res.json();
        return {
            ...d,
            headers: d.headers || dataset.headers || [],
            rows: d.rows || dataset.rows || []
        };
    },

    async getDatasets(): Promise<Dataset[]> {
        const res = await fetch(`${API_BASE}/datasets`);
        if (!res.ok) throw new Error('Failed to fetch datasets');
        try {
            const list: Dataset[] = await res.json();
            return list.map(d => ({
                ...d,
                headers: d.headers || [],
                rows: d.rows || []
            }));
        } catch {
            return [];
        }
    },

    async createSuite(suite: Partial<ExpectationSuite>): Promise<ExpectationSuite> {
        const res = await fetch(`${API_BASE}/suites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(suite)
        });
        if (!res.ok) throw new Error('Failed to save suite');
        return res.json();
    },

    async getSuites(): Promise<ExpectationSuite[]> {
        const res = await fetch(`${API_BASE}/suites`);
        return res.json();
    },

    async runValidation(datasetId: string, suiteId: string): Promise<ValidationResult> {
        const res = await fetch(`${API_BASE}/validate/${datasetId}/${suiteId}`, {
            method: 'POST'
        });
        if (!res.ok) throw new Error('Validation failed');
        return res.json();
    },

    async getHistory(): Promise<ValidationResult[]> {
        const res = await fetch(`${API_BASE}/runs`);
        return res.json();
    },

    async suggestExpectations(datasetId: string): Promise<any[]> {
        const res = await fetch(`${API_BASE}/suggest_expectations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datasetId) // Body(...) expects scalar or json depending on config, but usually standard JSON
        });
        return res.json();
    },

    async generateCode(suiteId: string): Promise<{ code: string }> {
        const res = await fetch(`${API_BASE}/generate_code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(suiteId)
        });
        return res.json();
    },

    async previewDataset(dataset: Partial<Dataset>): Promise<{ headers: string[], rows: any[] }> {
        const res = await fetch(`${API_BASE}/datasets/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataset)
        });
        // We allow error to propagate or handle gracefully
        if (!res.ok) throw new Error('Preview failed');
        return res.json();
    }
};
