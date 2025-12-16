
import { ExpectationType } from '../types';
import { translations } from '../translations';

export const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Format: YYYY-MM-DD HH:mm:ss
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
        return dateString;
    }
};

export const parseExpectationId = (id: string, t: any): { column: string, typeName: string } => {
    if (!id) return { column: 'Unknown', typeName: 'Unknown' };

    // Expect format like: "colName.expect_column_values_to_..."
    const parts = id.split('.');

    if (parts.length < 2) {
        return { column: 'Table', typeName: id };
    }

    // The last part is likely the expectation type
    const typeKey = parts[parts.length - 1];
    const column = parts.slice(0, parts.length - 1).join('.');

    // Try to find translation for type
    // We need to map the string typeKey (which comes from GX) to our ExpectationType enum if possible
    // Or just use the raw string if not found

    // Reverse lookup or direct access if we had a map.
    // We can try to match against translations.expectations

    let friendlyType = typeKey;

    // Try to find in translations
    // This depends on t passing the full translation object section
    if (t && t.expectations) {
        // We try to match known types
        if (t.expectations[typeKey]) {
            friendlyType = t.expectations[typeKey];
        } else {
            // Fallback: Make it readable (replace _ with space)
            friendlyType = typeKey.replace(/_/g, ' ');
        }
    }

    return { column, typeName: friendlyType };
};
