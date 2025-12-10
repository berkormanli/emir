import { TUICommand } from './hybrid-cli';
import { TerminalController } from '../tui/terminal-controller';
import { TUI } from '../tui/tui';
import { Menu, MenuItem } from '../tui/menu';
import { Form, FormField, TextInput, NumberInput, FormData } from '../tui/form';
import { Table, TableColumn } from '../tui/table';
import { ProgressBar } from '../tui/progress-bar';
import { Dialog, DialogResult } from '../tui/dialog';
import { Box } from '../tui/box';
import { Flex } from '../tui/flex';

/**
 * Menu-based TUI command
 */
export class MenuCommand extends TUICommand {
    private items: MenuItem[];
    private onSelect: (item: MenuItem) => void | Promise<void>;

    constructor(
        name: string, 
        description: string,
        items: MenuItem[],
        onSelect: (item: MenuItem) => void | Promise<void>
    ) {
        super(name, description);
        this.items = items;
        this.onSelect = onSelect;
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        const tui = new TUI(this.name, '1.0.0', this.description);
        
        const menu = new Menu('command-menu', {
            title: this.description,
            showBorder: true
        });

        this.items.forEach(item => menu.addItem(item));
        
        menu.setOnSelect(async (item) => {
            await this.onSelect(item);
            tui.stop();
        });

        tui.setRootComponent(menu);
        await tui.start();
    }
}

/**
 * Form-based TUI command
 */
export class FormCommand extends TUICommand {
    private fields: FormField[];
    private onSubmit: (data: FormData) => void | Promise<void>;
    private formTitle?: string;

    constructor(
        name: string,
        description: string,
        fields: FormField[],
        onSubmit: (data: FormData) => void | Promise<void>,
        formTitle?: string
    ) {
        super(name, description);
        this.fields = fields;
        this.onSubmit = onSubmit;
        this.formTitle = formTitle;
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        const tui = new TUI(this.name, '1.0.0', this.description);
        
        const form = new Form('command-form', {
            title: this.formTitle || this.description,
            showBorder: true,
            submitText: 'Submit',
            cancelText: 'Cancel'
        });

        this.fields.forEach(field => form.addField(field));
        
        form.setOnSubmit(async (data) => {
            await this.onSubmit(data);
            tui.stop();
        });

        form.setOnCancel(() => {
            tui.stop();
        });

        tui.setRootComponent(form);
        await tui.start();
    }

    /**
     * Helper to create a text input field
     */
    static createTextField(
        name: string,
        label: string,
        required: boolean = false,
        placeholder?: string,
        defaultValue?: string
    ): TextInput {
        return new TextInput(name, label, defaultValue || '', {
            required,
            placeholder
        });
    }

    /**
     * Helper to create a number input field
     */
    static createNumberField(
        name: string,
        label: string,
        required: boolean = false,
        min?: number,
        max?: number,
        defaultValue?: number
    ): NumberInput {
        return new NumberInput(name, label, defaultValue || 0, {
            required,
            min,
            max
        });
    }
}

/**
 * Table-based TUI command for displaying data
 */
export class TableCommand extends TUICommand {
    private columns: TableColumn[];
    private data: any[];
    private tableTitle?: string;
    private onSelect?: (row: any) => void | Promise<void>;

    constructor(
        name: string,
        description: string,
        columns: TableColumn[],
        data: any[],
        options?: {
            title?: string;
            onSelect?: (row: any) => void | Promise<void>;
        }
    ) {
        super(name, description);
        this.columns = columns;
        this.data = data;
        this.tableTitle = options?.title;
        this.onSelect = options?.onSelect;
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        const tui = new TUI(this.name, '1.0.0', this.description);
        
        const container = new Box('table-container', {
            border: true,
            borderStyle: 'single',
            title: this.tableTitle || this.description
        });

        const table = new Table('command-table', this.columns, this.data, {
            selectable: !!this.onSelect,
            sortable: true,
            alternateRowColor: true
        });

        if (this.onSelect) {
            table.setOnSelect(async (row) => {
                await this.onSelect!(row);
                tui.stop();
            });
        }

        container.addChild(table);
        tui.setRootComponent(container);
        
        // Add keyboard shortcut to exit
        tui.onKey('q', () => {
            tui.stop();
        });

        tui.onKey('escape', () => {
            tui.stop();
        });

        await tui.start();
    }
}

/**
 * Progress command for long-running operations
 */
export class ProgressCommand extends TUICommand {
    private task: (progress: (value: number, label?: string) => void) => Promise<void>;
    private progressTitle?: string;

    constructor(
        name: string,
        description: string,
        task: (progress: (value: number, label?: string) => void) => Promise<void>,
        progressTitle?: string
    ) {
        super(name, description);
        this.task = task;
        this.progressTitle = progressTitle;
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        const tui = new TUI(this.name, '1.0.0', this.description);
        
        const container = new Flex('progress-container', {
            direction: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 2
        });

        const titleBox = new Box('title', {
            border: false
        });
        titleBox.setContent(this.progressTitle || this.description);

        const progressBar = new ProgressBar('command-progress', {
            width: 60,
            showPercentage: true,
            showLabel: true
        });

        container.addFlexItem({ component: titleBox });
        container.addFlexItem({ component: progressBar });

        tui.setRootComponent(container);
        
        // Start the TUI
        const startPromise = tui.start();

        // Run the task
        try {
            await this.task((value, label) => {
                progressBar.setProgress(value);
                if (label) {
                    progressBar.setLabel(label);
                }
            });
            
            // Show completion
            progressBar.setProgress(100);
            progressBar.setLabel('Complete!');
            
            // Wait a moment before closing
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            tui.stop();
            await startPromise;
        }
    }
}

/**
 * Wizard command for multi-step processes
 */
export class WizardCommand extends TUICommand {
    private steps: WizardStep[];
    private wizardTitle?: string;
    private onComplete?: (data: any) => void | Promise<void>;

    constructor(
        name: string,
        description: string,
        steps: WizardStep[],
        options?: {
            title?: string;
            onComplete?: (data: any) => void | Promise<void>;
        }
    ) {
        super(name, description);
        this.steps = steps;
        this.wizardTitle = options?.title;
        this.onComplete = options?.onComplete;
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        const tui = new TUI(this.name, '1.0.0', this.description);
        const wizardData: any = {};
        let currentStep = 0;

        const showStep = async (stepIndex: number): Promise<boolean> => {
            if (stepIndex < 0 || stepIndex >= this.steps.length) {
                return false;
            }

            const step = this.steps[stepIndex];
            const isLastStep = stepIndex === this.steps.length - 1;

            const container = new Flex('wizard-container', {
                direction: 'column',
                padding: 1
            });

            // Title
            const titleBox = new Box('wizard-title', {
                border: false
            });
            titleBox.setContent(`${this.wizardTitle || this.description}\nStep ${stepIndex + 1} of ${this.steps.length}: ${step.title}`);
            container.addFlexItem({ component: titleBox });

            // Step content
            if (step.type === 'form') {
                const form = new Form(`step-${stepIndex}`, {
                    showBorder: true,
                    submitText: isLastStep ? 'Finish' : 'Next',
                    cancelText: stepIndex > 0 ? 'Back' : 'Cancel'
                });

                step.fields?.forEach(field => form.addField(field));

                form.setOnSubmit(async (data) => {
                    Object.assign(wizardData, data);
                    if (isLastStep) {
                        if (this.onComplete) {
                            await this.onComplete(wizardData);
                        }
                        tui.stop();
                    } else {
                        currentStep++;
                        await showStep(currentStep);
                    }
                });

                form.setOnCancel(() => {
                    if (stepIndex > 0) {
                        currentStep--;
                        showStep(currentStep);
                    } else {
                        tui.stop();
                    }
                });

                container.addFlexItem({ component: form, flexGrow: 1 });
            } else if (step.type === 'menu') {
                const menu = new Menu(`step-${stepIndex}`, {
                    showBorder: true
                });

                step.items?.forEach(item => menu.addItem(item));

                menu.setOnSelect(async (item) => {
                    wizardData[step.dataKey || `step${stepIndex}`] = item.value;
                    if (isLastStep) {
                        if (this.onComplete) {
                            await this.onComplete(wizardData);
                        }
                        tui.stop();
                    } else {
                        currentStep++;
                        await showStep(currentStep);
                    }
                });

                container.addFlexItem({ component: menu, flexGrow: 1 });
            }

            tui.setRootComponent(container);
            return true;
        };

        await showStep(0);
        await tui.start();
    }
}

/**
 * Wizard step definition
 */
export interface WizardStep {
    title: string;
    type: 'form' | 'menu' | 'custom';
    fields?: FormField[];  // For form type
    items?: MenuItem[];    // For menu type
    component?: any;       // For custom type
    dataKey?: string;      // Key to store step data in wizard result
}

/**
 * Confirmation command
 */
export class ConfirmCommand extends TUICommand {
    private message: string;
    private onConfirm: () => void | Promise<void>;
    private onCancel?: () => void | Promise<void>;
    private title?: string;

    constructor(
        name: string,
        description: string,
        message: string,
        onConfirm: () => void | Promise<void>,
        options?: {
            title?: string;
            onCancel?: () => void | Promise<void>;
        }
    ) {
        super(name, description);
        this.message = message;
        this.onConfirm = onConfirm;
        this.title = options?.title;
        this.onCancel = options?.onCancel;
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        const tui = new TUI(this.name, '1.0.0', this.description);
        
        const dialog = new Dialog('confirm-dialog', {
            type: 'confirm',
            title: this.title || 'Confirm',
            message: this.message,
            buttons: 'yes-no'
        });

        dialog.setOnResult(async (result: DialogResult) => {
            if (result.buttonId === 'yes') {
                await this.onConfirm();
            } else if (this.onCancel) {
                await this.onCancel();
            }
            tui.stop();
        });

        tui.setRootComponent(dialog);
        await tui.start();
    }
}

/**
 * File selector command (simulated with menu for now)
 */
export class FileSelectorCommand extends TUICommand {
    private directory: string;
    private filter?: RegExp;
    private onSelect: (path: string) => void | Promise<void>;

    constructor(
        name: string,
        description: string,
        directory: string,
        onSelect: (path: string) => void | Promise<void>,
        filter?: RegExp
    ) {
        super(name, description);
        this.directory = directory;
        this.filter = filter;
        this.onSelect = onSelect;
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        const fs = await import('fs/promises');
        const path = await import('path');
        
        const tui = new TUI(this.name, '1.0.0', this.description);
        
        // Read directory contents
        const files = await fs.readdir(this.directory);
        const filteredFiles = this.filter 
            ? files.filter(f => this.filter!.test(f))
            : files;

        const menuItems: MenuItem[] = filteredFiles.map(file => ({
            id: file,
            label: file,
            value: path.join(this.directory, file)
        }));

        // Add parent directory option
        menuItems.unshift({
            id: '..',
            label: '.. (Parent Directory)',
            value: path.dirname(this.directory)
        });

        const menu = new Menu('file-selector', {
            title: `Select File - ${this.directory}`,
            showBorder: true
        });

        menuItems.forEach(item => menu.addItem(item));

        menu.setOnSelect(async (item) => {
            await this.onSelect(item.value as string);
            tui.stop();
        });

        tui.setRootComponent(menu);
        await tui.start();
    }
}
