import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size, ValidationState } from '../../types';
import { ThemeManager } from '../../theme';
import { SchemaValidator, FormSchema, FieldSchema, ValidationResult } from './schema-validator';
import { DatePicker } from './date-picker';
import { ColorPicker } from './color-picker';
import { RichTextEditor } from './rich-text-editor';
import { TextInput } from '../text-input';
import { NumberInput } from '../number-input';

export interface FormData {
    [key: string]: any;
}

export class EnhancedForm extends BaseComponent {
    private validator: SchemaValidator;
    private data: FormData;
    private fieldComponents: Map<string, BaseComponent> = new Map();
    private validationResult: ValidationResult | null = null;
    private selectedFieldIndex = 0;
    private theme: ThemeManager;
    private conditionalVisibility: Map<string, boolean> = new Map();
    private conditionalEnabled: Map<string, boolean> = new Map();
    private conditionalRequired: Map<string, boolean> = new Map();

    constructor(
        id: string,
        position: Position,
        size: Size,
        schema: FormSchema
    ) {
        super(id, position, size);
        this.validator = new SchemaValidator(schema);
        this.data = this.validator.createEmptyData();
        this.theme = ThemeManager.getInstance();
        this.createFieldComponents();
        this.updateConditionals();
    }

    private createFieldComponents(): void {
        const schema = this.validator.getSchema();
        let yOffset = 0;

        for (const fieldSchema of schema.fields) {
            let component: BaseComponent;

            switch (fieldSchema.type) {
                case 'text':
                    component = new TextInput(
                        `${this.id}-${fieldSchema.name}`,
                        { x: 0, y: yOffset + 1 },
                        { width: this.size.width, height: 1 }
                    );
                    break;

                case 'number':
                    component = new NumberInput(
                        `${this.id}-${fieldSchema.name}`,
                        { x: 0, y: yOffset + 1 },
                        { width: this.size.width, height: 1 }
                    );
                    break;

                case 'date':
                    component = new DatePicker(
                        `${this.id}-${fieldSchema.name}`,
                        { x: 0, y: yOffset + 1 },
                        { width: Math.min(30, this.size.width), height: 1 }
                    );
                    break;

                case 'color':
                    component = new ColorPicker(
                        `${this.id}-${fieldSchema.name}`,
                        { x: 0, y: yOffset + 1 },
                        { width: Math.min(40, this.size.width), height: 8 }
                    );
                    break;

                case 'textarea':
                case 'rich':
                    component = new RichTextEditor(
                        `${this.id}-${fieldSchema.name}`,
                        { x: 0, y: yOffset + 1 },
                        { width: this.size.width, height: Math.min(8, this.size.height - yOffset - 3) }
                    );
                    break;

                default:
                    component = new TextInput(
                        `${this.id}-${fieldSchema.name}`,
                        { x: 0, y: yOffset + 1 },
                        { width: this.size.width, height: 1 }
                    );
                    break;
            }

            this.fieldComponents.set(fieldSchema.name, component);
            yOffset += this.getFieldHeight(fieldSchema);
        }
    }

    private getFieldHeight(field: FieldSchema): number {
        switch (field.type) {
            case 'textarea':
            case 'rich':
                return Math.min(8, this.size.height / 3);
            case 'color':
                return 8;
            case 'select':
                return 3;
            default:
                return 2;
        }
    }

    setData(data: FormData): void {
        this.data = { ...data };
        this.updateFieldComponents();
        this.validate();
        this.updateConditionals();
        this.markDirty();
    }

    getData(): FormData {
        const data: FormData = { ...this.data };

        for (const [fieldName, component] of this.fieldComponents) {
            if (component instanceof DatePicker) {
                const date = component.getSelectedDate();
                data[fieldName] = date ? date.toISOString() : null;
            } else if (component instanceof ColorPicker) {
                data[fieldName] = component.getColorString();
            } else if (component instanceof RichTextEditor) {
                data[fieldName] = component.getText();
            } else if (component instanceof TextInput || component instanceof NumberInput) {
                data[fieldName] = component.state.data;
            }
        }

        return data;
    }

    validate(): ValidationResult {
        const currentData = this.getData();
        this.validationResult = this.validator.validate(currentData);
        this.markDirty();
        return this.validationResult;
    }

    isValid(): boolean {
        return this.validationResult?.valid ?? true;
    }

    getErrors(): Record<string, string[]> {
        return this.validationResult?.errors ?? {};
    }

    private updateFieldComponents(): void {
        for (const [fieldName, component] of this.fieldComponents) {
            const value = this.data[fieldName];

            if (component instanceof DatePicker && value) {
                component.setSelectedDate(new Date(value));
            } else if (component instanceof ColorPicker && value) {
                component.setColor(value);
            } else if (component instanceof RichTextEditor) {
                component.setText(value ?? '');
            } else if (component instanceof TextInput || component instanceof NumberInput) {
                component.update(value);
            }
        }
    }

    private updateConditionals(): void {
        const currentData = this.getData();
        const results = this.validator.evaluateConditionals(currentData);

        this.conditionalVisibility.clear();
        this.conditionalEnabled.clear();
        this.conditionalRequired.clear();

        for (const [fieldName, conditions] of results) {
            if (conditions.show !== undefined) {
                this.conditionalVisibility.set(fieldName, conditions.show);
            }
            if (conditions.enable !== undefined) {
                this.conditionalEnabled.set(fieldName, conditions.enable);
            }
            if (conditions.required !== undefined) {
                this.conditionalRequired.set(fieldName, conditions.required);
            }
        }

        this.markDirty();
    }

    handleInput(input: InputEvent): boolean {
        const schema = this.validator.getSchema();
        const visibleFields = schema.fields.filter(field => {
            const isVisible = this.conditionalVisibility.get(field.name) ?? !field.hidden;
            return isVisible;
        });

        if (visibleFields.length === 0) return false;

        const currentField = visibleFields[this.selectedFieldIndex];
        const component = this.fieldComponents.get(currentField.name);

        if (component) {
            const handled = component.handleInput(input);
            if (handled) {
                this.data[currentField.name] = this.getFieldValue(currentField, component);
                this.updateConditionals();
                this.validate();
                this.markDirty();
                return true;
            }
        }

        if (input.type === 'key') {
            switch (input.key) {
                case 'tab':
                    if (input.shift) {
                        this.navigateField(-1);
                    } else {
                        this.navigateField(1);
                    }
                    return true;

                case 'enter':
                case 'Return':
                    if (this.selectedFieldIndex === visibleFields.length - 1) {
                        this.submit();
                    } else {
                        this.navigateField(1);
                    }
                    return true;

                case 'escape':
                    this.blur();
                    return true;
            }
        }

        return false;
    }

    private navigateField(direction: number): void {
        const schema = this.validator.getSchema();
        const visibleFields = schema.fields.filter(field => {
            const isVisible = this.conditionalVisibility.get(field.name) ?? !field.hidden;
            const isEnabled = this.conditionalEnabled.get(field.name) ?? !field.disabled;
            return isVisible && isEnabled;
        });

        this.selectedFieldIndex = Math.max(
            0,
            Math.min(visibleFields.length - 1, this.selectedFieldIndex + direction)
        );

        const currentField = visibleFields[this.selectedFieldIndex];
        const component = this.fieldComponents.get(currentField.name);
        if (component) {
            component.focus();
        }

        this.markDirty();
    }

    private getFieldValue(field: FieldSchema, component: BaseComponent): any {
        if (component instanceof DatePicker) {
            const date = component.getSelectedDate();
            return date ? date.toISOString() : null;
        } else if (component instanceof ColorPicker) {
            return component.getColorString();
        } else if (component instanceof RichTextEditor) {
            return component.getText();
        } else if (component instanceof TextInput || component instanceof NumberInput) {
            return component.state.data;
        }
        return component.state.data;
    }

    submit(): boolean {
        const result = this.validate();
        if (result.valid) {
            this.onSubmit(this.getData());
            return true;
        } else {
            this.firstErrorField();
            return false;
        }
    }

    reset(): void {
        this.data = this.validator.createEmptyData();
        this.updateFieldComponents();
        this.validate();
        this.updateConditionals();
        this.selectedFieldIndex = 0;
        this.markDirty();
    }

    private firstErrorField(): void {
        const schema = this.validator.getSchema();
        const errors = this.getErrors();

        for (let i = 0; i < schema.fields.length; i++) {
            if (errors[schema.fields[i].name]) {
                this.selectedFieldIndex = i;
                const component = this.fieldComponents.get(schema.fields[i].name);
                if (component) {
                    component.focus();
                }
                this.markDirty();
                break;
            }
        }
    }

    protected onSubmit(data: FormData): void {
        // Override in subclasses for custom submit behavior
    }

    protected onReset(): void {
        // Override in subclasses for custom reset behavior
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];
        const schema = this.validator.getSchema();

        let yOffset = 0;

        for (let i = 0; i < schema.fields.length; i++) {
            const field = schema.fields[i];
            const isVisible = this.conditionalVisibility.get(field.name) ?? !field.hidden;
            if (!isVisible) continue;

            const isEnabled = this.conditionalEnabled.get(field.name) ?? !field.disabled;
            const isRequired = this.conditionalRequired.get(field.name) ?? false;
            const isSelected = this.state.focused && i === this.selectedFieldIndex;
            const component = this.fieldComponents.get(field.name);

            if (component) {
                if (isSelected && !component.isFocused()) {
                    component.focus();
                } else if (!isSelected && component.isFocused()) {
                    component.blur();
                }
            }

            const label = field.label + (isRequired ? ' *' : '');
            let labelText = theme.applyColor(label, 'textPrimary');
            if (isSelected) {
                labelText = theme.applyTypography(labelText, 'button');
            }

            lines.push(labelText);

            if (component) {
                const componentRender = component.render();
                const componentLines = componentRender.split('\n');

                if (field.disabled || !isEnabled) {
                    for (let j = 0; j < componentLines.length; j++) {
                        componentLines[j] = theme.applyColor(componentLines[j], 'textDisabled');
                    }
                }

                lines.push(...componentLines);
            }

            const errors = this.getErrors()[field.name];
            if (errors && errors.length > 0) {
                const errorText = errors[0];
                lines.push(theme.applyColor('  ◆ ' + errorText, 'error'));
            } else if (field.description) {
                lines.push(theme.applyColor('  ◇ ' + field.description, 'textSecondary'));
            }

            yOffset += this.getFieldHeight(field);

            if (yOffset >= this.size.height) break;
        }

        if (yOffset < this.size.height && schema.submitText) {
            lines.push('');
            const submitButton = theme.applyColor(' [' + schema.submitText + '] ', 'primary');
            lines.push(submitButton);

            if (schema.showReset && schema.resetText) {
                const resetButton = theme.applyColor(' [' + schema.resetText + '] ', 'secondary');
                lines.push(resetButton);
            }
        }

        return lines.slice(0, this.size.height).join('\n');
    }
}