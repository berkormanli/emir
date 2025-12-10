export interface ValidationRule {
    type: 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'pattern' | 'email' | 'custom';
    value?: any;
    message: string;
    validator?: (value: any) => boolean;
}

export interface FieldSchema {
    type: 'text' | 'number' | 'email' | 'password' | 'date' | 'select' | 'checkbox' | 'radio' | 'textarea';
    label: string;
    name: string;
    placeholder?: string;
    defaultValue?: any;
    options?: Array<{ value: any; label: string }>;
    validation?: ValidationRule[];
    conditional?: {
        field: string;
        operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
        value: any;
        action: 'show' | 'hide' | 'enable' | 'disable' | 'require';
    }[];
    description?: string;
    disabled?: boolean;
    hidden?: boolean;
}

export interface FormSchema {
    fields: FieldSchema[];
    layout?: 'vertical' | 'horizontal' | 'grid';
    columns?: number;
    submitText?: string;
    resetText?: string;
    showReset?: boolean;
}

export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string[]>;
    warnings: Record<string, string[]>;
}

export class SchemaValidator {
    private schema: FormSchema;
    private customValidators: Map<string, (value: any) => boolean> = new Map();

    constructor(schema: FormSchema) {
        this.schema = schema;
    }

    validate(data: Record<string, any>): ValidationResult {
        const errors: Record<string, string[]> = {};
        const warnings: Record<string, string[]> = {};
        let valid = true;

        for (const field of this.schema.fields) {
            const value = data[field.name];
            const fieldErrors: string[] = [];
            const fieldWarnings: string[] = [];

            if (field.validation) {
                for (const rule of field.validation) {
                    const result = this.validateRule(rule, value, field);
                    if (!result.valid) {
                        fieldErrors.push(result.message);
                        valid = false;
                    }
                }
            }

            if (fieldErrors.length > 0) {
                errors[field.name] = fieldErrors;
            }
            if (fieldWarnings.length > 0) {
                warnings[field.name] = fieldWarnings;
            }
        }

        return { valid, errors, warnings };
    }

    private validateRule(rule: ValidationRule, value: any, field: FieldSchema): { valid: boolean; message: string } {
        switch (rule.type) {
            case 'required':
                if (value === undefined || value === null || value === '') {
                    return { valid: false, message: rule.message || `${field.label} is required` };
                }
                break;

            case 'minLength':
                if (value && typeof value === 'string' && value.length < rule.value) {
                    return {
                        valid: false,
                        message: rule.message || `${field.label} must be at least ${rule.value} characters`
                    };
                }
                break;

            case 'maxLength':
                if (value && typeof value === 'string' && value.length > rule.value) {
                    return {
                        valid: false,
                        message: rule.message || `${field.label} must be no more than ${rule.value} characters`
                    };
                }
                break;

            case 'min':
                if (value !== undefined && value !== null && Number(value) < rule.value) {
                    return {
                        valid: false,
                        message: rule.message || `${field.label} must be at least ${rule.value}`
                    };
                }
                break;

            case 'max':
                if (value !== undefined && value !== null && Number(value) > rule.value) {
                    return {
                        valid: false,
                        message: rule.message || `${field.label} must be no more than ${rule.value}`
                    };
                }
                break;

            case 'pattern':
                if (value && typeof value === 'string') {
                    const regex = new RegExp(rule.value);
                    if (!regex.test(value)) {
                        return {
                            valid: false,
                            message: rule.message || `${field.label} format is invalid`
                        };
                    }
                }
                break;

            case 'email':
                if (value && typeof value === 'string') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) {
                        return {
                            valid: false,
                            message: rule.message || `${field.label} must be a valid email address`
                        };
                    }
                }
                break;

            case 'custom':
                if (rule.validator) {
                    if (!rule.validator(value)) {
                        return { valid: false, message: rule.message };
                    }
                }
                break;
        }

        return { valid: true, message: '' };
    }

    evaluateConditionals(data: Record<string, any>): Map<string, { show?: boolean; enable?: boolean; required?: boolean }> {
        const results = new Map<string, { show?: boolean; enable?: boolean; required?: boolean }>();

        for (const field of this.schema.fields) {
            if (!field.conditional) continue;

            let show = field.hidden !== true;
            let enable = field.disabled !== true;
            let required = false;

            for (const condition of field.conditional) {
                const fieldValue = data[condition.field];
                let conditionMet = false;

                switch (condition.operator) {
                    case 'equals':
                        conditionMet = fieldValue === condition.value;
                        break;
                    case 'not_equals':
                        conditionMet = fieldValue !== condition.value;
                        break;
                    case 'contains':
                        conditionMet = fieldValue && typeof fieldValue === 'string' &&
                                       fieldValue.includes(condition.value);
                        break;
                    case 'greater_than':
                        conditionMet = Number(fieldValue) > Number(condition.value);
                        break;
                    case 'less_than':
                        conditionMet = Number(fieldValue) < Number(condition.value);
                        break;
                }

                if (conditionMet) {
                    switch (condition.action) {
                        case 'show':
                            show = true;
                            break;
                        case 'hide':
                            show = false;
                            break;
                        case 'enable':
                            enable = true;
                            break;
                        case 'disable':
                            enable = false;
                            break;
                        case 'require':
                            required = true;
                            break;
                    }
                }
            }

            results.set(field.name, { show, enable, required });
        }

        return results;
    }

    getDefaultValue(field: FieldSchema): any {
        if (field.defaultValue !== undefined) return field.defaultValue;

        switch (field.type) {
            case 'checkbox':
                return false;
            case 'number':
                return 0;
            case 'select':
            case 'radio':
                return field.options && field.options.length > 0 ? field.options[0].value : '';
            default:
                return '';
        }
    }

    createEmptyData(): Record<string, any> {
        const data: Record<string, any> = {};
        for (const field of this.schema.fields) {
            data[field.name] = this.getDefaultValue(field);
        }
        return data;
    }

    registerCustomValidator(name: string, validator: (value: any) => boolean): void {
        this.customValidators.set(name, validator);
    }

    getCustomValidator(name: string): ((value: any) => boolean) | undefined {
        return this.customValidators.get(name);
    }

    updateSchema(newSchema: FormSchema): void {
        this.schema = newSchema;
    }

    getSchema(): FormSchema {
        return { ...this.schema };
    }

    getField(name: string): FieldSchema | undefined {
        return this.schema.fields.find(field => field.name === name);
    }

    addField(field: FieldSchema, index?: number): void {
        if (index !== undefined && index >= 0 && index <= this.schema.fields.length) {
            this.schema.fields.splice(index, 0, field);
        } else {
            this.schema.fields.push(field);
        }
    }

    removeField(name: string): boolean {
        const index = this.schema.fields.findIndex(field => field.name === name);
        if (index !== -1) {
            this.schema.fields.splice(index, 1);
            return true;
        }
        return false;
    }

    updateField(name: string, updates: Partial<FieldSchema>): boolean {
        const field = this.getField(name);
        if (field) {
            Object.assign(field, updates);
            return true;
        }
        return false;
    }
}