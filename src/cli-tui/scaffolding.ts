import { HybridCLI, type TUICommand } from './hybrid-cli';
import { Command, type Option } from '../index';
import { FormData } from '../tui/form';
import { Menu, MenuItem } from '../tui/menu';
import { Dialog, DialogResult } from '../tui/dialog';
import { TerminalController } from '../tui/terminal-controller';
import { Progress } from '../tui/progress';
import { Table } from '../tui/table';
import { TUI } from '../tui/tui';
import { writeFile, mkdir, readFile, existsSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { promisify } from 'util';

const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);
const readFileAsync = promisify(readFile);

/**
 * Template types for scaffolding
 */
export enum TemplateType {
    CLI_APP = 'cli-app',
    HYBRID_APP = 'hybrid-app',
    COMMAND = 'command',
    TUI_COMPONENT = 'tui-component',
    PLUGIN = 'plugin'
}

/**
 * Project template configuration
 */
export interface ProjectTemplate {
    name: string;
    description: string;
    type: TemplateType;
    files: TemplateFile[];
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
}

/**
 * Template file configuration
 */
export interface TemplateFile {
    path: string;
    template: string;
    encoding?: BufferEncoding;
}

/**
 * Scaffolding options
 */
export interface ScaffoldingOptions {
    projectType?: TemplateType;
    projectName?: string;
    author?: string;
    description?: string;
    license?: string;
    gitInit?: boolean;
    npmInstall?: boolean;
    typescript?: boolean;
    testing?: boolean;
    outputPath?: string;
}

/**
 * Templates for different project types
 */
const TEMPLATES: Record<TemplateType, ProjectTemplate> = {
    [TemplateType.CLI_APP]: {
        name: 'CLI Application',
        description: 'A basic command-line interface application',
        type: TemplateType.CLI_APP,
        files: [
            {
                path: 'src/index.ts',
                template: `import { CLI, Command } from '{{packageName}}';

const cli = new CLI(
    '{{projectName}}',
    '1.0.0',
    '{{description}}'
);

// Add your commands here
cli.addCommand(new Command(
    'hello',
    'Say hello to the world',
    (args, options) => {
        console.log('Hello, World!');
    }
));

cli.parse(process.argv.slice(2));
`
            },
            {
                path: 'package.json',
                template: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "dist/index.js",
  "bin": {
    "{{projectName}}": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "vitest",
    "test:watch": "vitest --watch"
  },
  "keywords": ["cli", "terminal"],
  "author": "{{author}}",
  "license": "{{license}}",
  "dependencies": {
    "{{packageName}}": "^{{packageVersion}}"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}
`
            },
            {
                path: 'tsconfig.json',
                template: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
`
            },
            {
                path: 'README.md',
                template: `# {{projectName}}

{{description}}

## Installation

\`\`\`bash
npm install -g {{projectName}}
\`\`\`

## Usage

\`\`\`bash
{{projectName}} hello
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## License

{{license}}
`
            }
        ]
    },

    [TemplateType.HYBRID_APP]: {
        name: 'Hybrid CLI/TUI Application',
        description: 'A CLI application with TUI support',
        type: TemplateType.HYBRID_APP,
        files: [
            {
                path: 'src/index.ts',
                template: `import { HybridCLI, TUICommand } from '{{packageName}}';
import { Form, Menu } from '{{packageName}}/tui';

const cli = new HybridCLI(
    '{{projectName}}',
    '1.0.0',
    '{{description}}',
    {
        defaultMode: 'auto',
        tuiEnabled: true
    }
);

// Add a simple command
cli.addHybridCommand(
    new Command(
        'greet',
        'Greet someone',
        (args, options) => {
            const name = options.name || 'World';
            console.log(\`Hello, \${name}!\`);
        },
        [
            {
                short: 'n',
                long: 'name',
                description: 'Name to greet',
                required: false
            }
        ]
    ),
    new GreetCommand()
);

// Add interactive mode command
cli.addHybridCommand(
    new Command(
        'interactive',
        'Launch interactive mode',
        () => {
            // Handled by the hybrid CLI
        }
    ),
    new InteractiveCommand()
);

cli.parse(process.argv.slice(2));

class GreetCommand extends TUICommand {
    constructor() {
        super('greet', 'Greet someone interactively');
    }

    async execute(args: string[], terminal: TerminalController) {
        const form = new Form('greet-form', [
            Form.createTextField('name', 'Name', true),
            Form.createSelectField('style', 'Greeting Style', ['casual', 'formal', 'enthusiastic'], 'casual')
        ]);

        const result = await form.show();

        if (result) {
            const style = result.style as string;
            const name = result.name as string;

            let greeting: string;
            switch (style) {
                case 'formal':
                    greeting = \`Good day, \${name}.\`;
                    break;
                case 'enthusiastic':
                    greeting = \`Hello, \${name}! 🎉\`;
                    break;
                default:
                    greeting = \`Hey, \${name}!\`;
            }

            await terminal.showMessage(greeting);
        }
    }
}

class InteractiveCommand extends TUICommand {
    constructor() {
        super('interactive', 'Launch interactive menu');
    }

    async execute(args: string[], terminal: TerminalController) {
        const menu = new Menu('main-menu', [
            { id: 'greet', label: 'Greet Someone', description: 'Open the greeting form' },
            { id: 'about', label: 'About', description: 'About this application' },
            { id: 'exit', label: 'Exit', description: 'Exit the application' }
        ], {
            title: '{{projectName}} - Interactive Mode'
        });

        const selection = await menu.show();

        switch (selection?.id) {
            case 'greet':
                await new GreetCommand().execute([], terminal);
                break;
            case 'about':
                await terminal.showMessage('{{description}}');
                break;
            case 'exit':
                // Exit handled by menu
                break;
        }
    }
}
`
            },
            {
                path: 'package.json',
                template: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "dist/index.js",
  "bin": {
    "{{projectName}}": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "vitest",
    "test:watch": "vitest --watch"
  },
  "keywords": ["cli", "tui", "terminal", "interactive"],
  "author": "{{author}}",
  "license": "{{license}}",
  "dependencies": {
    "{{packageName}}": "^{{packageVersion}}"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0"
  }
}
`
            },
            {
                path: 'tsconfig.json',
                template: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
`
            },
            {
                path: 'README.md',
                template: `# {{projectName}}

{{description}}

A hybrid CLI/TUI application that supports both command-line and interactive modes.

## Installation

\`\`\`bash
npm install -g {{projectName}}
\`\`\`

## Usage

### CLI Mode
\`\`\`bash
{{projectName}} greet --name "Alice"
\`\`\`

### Interactive Mode
\`\`\`bash
{{projectName}} -i
\`\`\`

or

\`\`\`bash
{{projectName}} interactive
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## License

{{license}}
`
            }
        ]
    },

    [TemplateType.COMMAND]: {
        name: 'CLI Command',
        description: 'A reusable CLI command',
        type: TemplateType.COMMAND,
        files: [
            {
                path: 'src/{{commandName}}.ts',
                template: `import { Command, type Option } from '{{packageName}}';

export interface {{CommandName}}Options {
    // Define your command options here
}

export class {{CommandName}}Command extends Command {
    constructor() {
        super(
            '{{commandName}}',
            '{{commandDescription}}',
            this.execute.bind(this),
            this.getOptions()
        );
    }

    private getOptions(): Option[] {
        return [
            // Define your command options here
            // {
            //     short: 'v',
            //     long: 'verbose',
            //     description: 'Enable verbose output',
            //     required: false
            // }
        ];
    }

    private async execute(args: string[], options: Record<string, any>): Promise<void> {
        // Your command logic here
        console.log('Executing {{commandName}} command');
        console.log('Args:', args);
        console.log('Options:', options);
    }
}
`
            },
            {
                path: 'src/index.ts',
                template: `import { CLI } from '{{packageName}}';
import { {{CommandName}}Command } from './{{commandName}}';

const cli = new CLI(
    '{{projectName}}',
    '1.0.0',
    '{{description}}'
);

cli.addCommand(new {{CommandName}}Command());

cli.parse(process.argv.slice(2));
`
            },
            {
                path: 'package.json',
                template: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "author": "{{author}}",
  "license": "{{license}}",
  "dependencies": {
    "{{packageName}}": "^{{packageVersion}}"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
`
            }
        ]
    },

    [TemplateType.TUI_COMPONENT]: {
        name: 'TUI Component',
        description: 'A custom TUI component',
        type: TemplateType.TUI_COMPONENT,
        files: [
            {
                path: 'src/{{componentName}}.ts',
                template: `import { BaseComponent, type Position, type Size } from '{{packageName}}';

export interface {{ComponentName}}Props {
    // Define your component props here
    title?: string;
    content?: string;
}

/**
 * {{ComponentName}} component
 * {{componentDescription}}
 */
export class {{ComponentName}} extends BaseComponent {
    private props: {{ComponentName}}Props;

    constructor(id: string, props: {{ComponentName}}Props = {}) {
        super(id);
        this.props = {
            title: props.title || 'Default Title',
            content: props.content || 'Default content'
        };
    }

    protected override onRender(): string {
        const { title, content } = this.props;

        return \`
\${this.styleBorder('┌─', '─', '─┐')}
\${this.styleBorder('│ ', ' ', ' │')} \${title}
\${this.styleBorder('├─', '─', '─┤')}
\${this.styleBorder('│ ', ' ', ' │')} \${content}
\${this.styleBorder('└─', '─', '─┘')}
        \`.trim();
    }

    protected override onResize(size: Size): void {
        // Handle resize logic
        this.markDirty();
    }

    protected override onFocus(): void {
        // Handle focus gain
        this.markDirty();
    }

    protected override onBlur(): void {
        // Handle focus loss
        this.markDirty();
    }

    /**
     * Update component props
     */
    updateProps(newProps: Partial<{{ComponentName}}Props>): void {
        this.props = { ...this.props, ...newProps };
        this.markDirty();
    }
}
`
            },
            {
                path: 'src/index.ts',
                template: `import { {{ComponentName}} } from './{{componentName}}';

export { {{ComponentName}} };
export type { {{ComponentName}}Props } from './{{componentName}}';
`
            },
            {
                path: 'src/demo.ts',
                template: `import { TUI } from '{{packageName}}/tui';
import { {{ComponentName}} } from './{{componentName}}';

const tui = new TUI('Demo', '1.0.0', '{{componentName}} Demo');

const component = new {{ComponentName}}('demo', {
    title: 'Demo Component',
    content: 'This is a demo of the {{ComponentName}} component'
});

tui.addComponent(component);
tui.start();
`
            },
            {
                path: 'package.json',
                template: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "demo": "ts-node src/demo.ts",
    "test": "vitest"
  },
  "author": "{{author}}",
  "license": "{{license}}",
  "peerDependencies": {
    "{{packageName}}": "^{{packageVersion}}"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "vitest": "^1.0.0"
  }
}
`
            }
        ]
    },

    [TemplateType.PLUGIN]: {
        name: 'Plugin',
        description: 'A plugin for extending functionality',
        type: TemplateType.PLUGIN,
        files: [
            {
                path: 'src/index.ts',
                template: `import { CLI } from '{{packageName}}';

export interface {{PluginName}}Options {
    // Define plugin options here
}

/**
 * {{PluginName}} plugin
 */
export class {{PluginName}}Plugin {
    private options: {{PluginName}}Options;

    constructor(options: {{PluginName}}Options = {}) {
        this.options = options;
    }

    /**
     * Register the plugin with a CLI instance
     */
    register(cli: CLI): void {
        // Add your plugin commands here
        cli.addCommand({
            name: '{{pluginCommand}}',
            description: '{{pluginDescription}}',
            handler: this.handleCommand.bind(this)
        });
    }

    private handleCommand(args: string[], options: Record<string, any>): void {
        // Your plugin logic here
        console.log('{{PluginName}} plugin command executed');
    }
}

// Export plugin creator function
export function create{{PluginName}}(options: {{PluginName}}Options = {}): {{PluginName}}Plugin {
    return new {{PluginName}}Plugin(options);
}
`
            },
            {
                path: 'package.json',
                template: `{
  "name": "{{projectName}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "keywords": ["plugin", "cli"],
  "author": "{{author}}",
  "license": "{{license}}",
  "peerDependencies": {
    "{{packageName}}": "^{{packageVersion}}"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
`
            }
        ]
    }
};

/**
 * CLI Scaffolding Tool
 */
export class CLIScaffolder {
    private terminal: TerminalController;

    constructor(terminal: TerminalController) {
        this.terminal = terminal;
    }

    /**
     * Create a new project from template
     */
    async createProject(options: ScaffoldingOptions): Promise<void> {
        const template = TEMPLATES[options.projectType || TemplateType.CLI_APP];

        if (!template) {
            throw new Error(`Unknown project type: ${options.projectType}`);
        }

        const outputPath = options.outputPath || process.cwd();
        const projectPath = join(outputPath, options.projectName || 'my-project');

        // Show progress
        const progress = new Progress('scaffold-progress', {
            title: `Creating ${template.name}...`,
            total: template.files.length + 3
        });

        await this.terminal.addComponent(progress);
        progress.setValue(0);

        try {
            // Create project directory
            await mkdirAsync(projectPath, { recursive: true });
            progress.increment();

            // Create source directory
            await mkdirAsync(join(projectPath, 'src'), { recursive: true });
            progress.increment();

            // Process template files
            for (const file of template.files) {
                const filePath = join(projectPath, this.processTemplate(file.path, options));
                const content = this.processTemplate(file.template, options);

                // Ensure directory exists
                await mkdirAsync(dirname(filePath), { recursive: true });

                // Write file
                await writeFileAsync(filePath, content, file.encoding || 'utf8');
                progress.increment();
            }

            // Initialize git if requested
            if (options.gitInit) {
                await this.initializeGit(projectPath);
            }

            progress.complete();
            await this.terminal.showMessage(`✅ Project created successfully at: ${projectPath}`);

            // Show next steps
            const steps = [
                `cd ${projectPath}`,
                options.npmInstall ? 'npm install' : '',
                'npm run dev'
            ].filter(Boolean);

            await this.terminal.showMessage(`Next steps:\n${steps.join('\n')}`);

        } catch (error) {
            progress.fail();
            await this.terminal.showMessage(`❌ Error creating project: ${error}`);
            throw error;
        }
    }

    /**
     * Show interactive project creation wizard
     */
    async showCreateWizard(): Promise<void> {
        // Create a simple interactive wizard using prompts
        const answers: any = {};

        // Project name
        answers.projectName = await this.prompt(
            'Enter project name:',
            'Project Name',
            'my-cli-app'
        );

        // Project type
        const typeItems = Object.values(TemplateType).map(type => ({
            id: type,
            label: TEMPLATES[type as TemplateType].name,
            description: TEMPLATES[type as TemplateType].description
        }));

        const typeSelection = await this.selectFromList(
            'Select project type:',
            typeItems
        );
        answers.projectType = typeSelection.id as TemplateType;

        // Description
        answers.description = await this.prompt(
            'Enter description (optional):',
            'Description',
            'A CLI application'
        );

        // Author
        answers.author = await this.prompt(
            'Enter author name (optional):',
            'Author',
            ''
        );

        // License
        const licenseSelection = await this.selectFromList(
            'Select license:',
            ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC'].map(license => ({
                id: license,
                label: license
            }))
        );
        answers.license = licenseSelection.id as string;

        // Output path
        answers.outputPath = await this.prompt(
            'Enter output path:',
            'Output Path',
            process.cwd()
        );

        // Initialize Git
        answers.gitInit = await this.confirm(
            'Initialize Git repository?',
            'Git Initialization'
        );

        // Run npm install
        answers.npmInstall = await this.confirm(
            'Run npm install after creating project?',
            'Dependencies'
        );

        await this.createProject({
            projectType: answers.projectType,
            projectName: answers.projectName,
            description: answers.description,
            author: answers.author,
            license: answers.license,
            outputPath: answers.outputPath,
            gitInit: answers.gitInit,
            npmInstall: answers.npmInstall
        });
    }

    /**
     * Simple prompt implementation
     */
    private async prompt(message: string, title: string = 'Input', defaultValue?: string): Promise<string> {
        const dialog = new Dialog('prompt-dialog', {
            type: 'prompt',
            title,
            message,
            inputDefaultValue: defaultValue,
            buttons: 'ok-cancel'
        });

        const tui = new TUI('prompt', '1.0.0', 'Prompt');
        tui.addComponent(dialog);

        return new Promise((resolve) => {
            dialog.setOnResult((result: DialogResult) => {
                resolve(result.buttonId === 'ok' ? result.inputValue || defaultValue || '' : defaultValue || '');
                tui.stop();
            });

            tui.start();
        });
    }

    /**
     * Select from list implementation
     */
    private async selectFromList(message: string, items: any[]): Promise<any> {
        const menu = new Menu('select-menu', items, {
            title: message,
            showBorder: true
        });

        const tui = new TUI('select', '1.0.0', 'Select');
        tui.addComponent(menu);

        return new Promise((resolve) => {
            menu.setOnSelect((item) => {
                resolve(item);
                tui.stop();
            });

            tui.start();
        });
    }

    /**
     * List available templates
     */
    async listTemplates(): Promise<void> {
        const table = new Table('templates-table', {
            columns: [
                { id: 'type', title: 'Type', width: 20 },
                { id: 'name', title: 'Name', width: 30 },
                { id: 'description', title: 'Description', width: 50 }
            ],
            rows: Object.values(TemplateType).map(type => {
                const template = TEMPLATES[type as TemplateType];
                return {
                    type,
                    name: template.name,
                    description: template.description
                };
            }),
            showHeaders: true,
            showBorders: true
        });

        await this.terminal.addComponent(table);
        await this.terminal.showMessage('Available Templates');
    }

    /**
     * Process template variables
     */
    private processTemplate(template: string, options: ScaffoldingOptions): string {
        // Get package info
        const packageJsonPath = join(__dirname, '../../package.json');
        let packageName = '@your-org/cli-framework';
        let packageVersion = '1.0.0';

        try {
            if (existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(readFileAsync(packageJsonPath, 'utf8') as any);
                packageName = packageJson.name || packageName;
                packageVersion = packageJson.version || packageVersion;
            }
        } catch {
            // Use defaults
        }

        // Process template variables
        let processed = template;

        processed = processed.replace(/\{\{projectName\}\}/g, options.projectName || 'my-project');
        processed = processed.replace(/\{\{description\}\}/g, options.description || 'A CLI application');
        processed = processed.replace(/\{\{author\}\}/g, options.author || '');
        processed = processed.replace(/\{\{license\}\}/g, options.license || 'MIT');
        processed = processed.replace(/\{\{packageName\}\}/g, packageName);
        processed = processed.replace(/\{\{packageVersion\}\}/g, packageVersion);

        // Handle component/command specific variables
        if (options.projectName) {
            const componentName = this.toPascalCase(options.projectName);
            const commandName = this.toKebabCase(options.projectName);

            processed = processed.replace(/\{\{componentName\}\}/g, componentName);
            processed = processed.replace(/\{\{ComponentName\}\}/g, componentName);
            processed = processed.replace(/\{\{commandName\}\}/g, commandName);
            processed = processed.replace(/\{\{CommandName\}\}/g, componentName);
            processed = processed.replace(/\{\{pluginCommand\}\}/g, commandName);
            processed = processed.replace(/\{\{pluginDescription\}\}/g, `Plugin for ${options.projectName}`);
            processed = processed.replace(/\{\{PluginName\}\}/g, componentName);
            processed = processed.replace(/\{\{componentDescription\}\}/g, `A custom ${componentName} component`);
        }

        return processed;
    }

    /**
     * Initialize git repository
     */
    private async initializeGit(projectPath: string): Promise<void> {
        const { spawn } = await import('child_process');

        return new Promise((resolve, reject) => {
            const git = spawn('git', ['init'], { cwd: projectPath });

            git.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Git init failed with code ${code}`));
                }
            });
        });
    }

    /**
     * Convert string to PascalCase
     */
    private toPascalCase(str: string): string {
        return str
            .replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase())
            .replace(/[-_]/g, '');
    }

    /**
     * Convert string to kebab-case
     */
    private toKebabCase(str: string): string {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }
}

/**
 * TUI Command for scaffolding
 */
export class ScaffoldingCommand extends TUICommand {
    private scaffolder: CLIScaffolder;

    constructor() {
        super('scaffold', 'CLI project scaffolding tool');
    }

    async execute(args: string[], terminal: TerminalController): Promise<void> {
        this.scaffolder = new CLIScaffolder(terminal);

        if (args.length === 0) {
            // Show interactive wizard
            await this.scaffolder.showCreateWizard();
            return;
        }

        const [command, ...commandArgs] = args;

        switch (command) {
            case 'list':
                await this.scaffolder.listTemplates();
                break;
            case 'create':
                // Parse creation arguments
                await this.handleCreateCommand(commandArgs);
                break;
            default:
                await terminal.showMessage(`Unknown scaffold command: ${command}`);
                await this.showHelp(terminal);
        }
    }

    private async handleCreateCommand(args: string[]): Promise<void> {
        const options: ScaffoldingOptions = {
            projectName: args[0],
            projectType: args[1] as TemplateType || TemplateType.CLI_APP
        };

        if (!options.projectName) {
            await this.terminal.showMessage('❌ Project name is required');
            return;
        }

        await this.scaffolder.createProject(options);
    }

    private async showHelp(terminal: TerminalController): Promise<void> {
        await terminal.showMessage(`
Scaffolding Commands:

  scaffold               Show interactive creation wizard
  scaffold create <name> [type]  Create project with specified type
  scaffold list          List available templates

Available Types:
  - cli-app: Basic CLI application
  - hybrid-app: CLI with TUI support
  - command: Reusable CLI command
  - tui-component: Custom TUI component
  - plugin: Plugin for extending functionality
        `);
    }
}