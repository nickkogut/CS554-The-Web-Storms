export const rules = {
    minLength: (min) => (value) => value?.trim().length < min ? `Must be at least ${min} characters` : null,
    maxLength: (max) => (value) => value?.trim().length > max ? `Must be no more than ${max} characters` : null,
    numbers: (inp) => /^\d+$/.test(inp?.trim()) ? 'Must not contain only numbers' : null
}

export function validate(value, fieldRules) {
    for (const rule of fieldRules) {
        const error = rule(value);
        if (error) return error;
    }
    return null;
}