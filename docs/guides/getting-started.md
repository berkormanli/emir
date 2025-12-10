# Getting Started

Welcome to Emir! This guide will help you build your first CLI application with Emir.

## Installation

```bash
npm install emir
```

## Your First CLI App

### Basic CLI Application

Create a new file `src/index.ts`:

```typescript
import { CLI, Command } from 'emir';

// Create CLI instance
const cli = new CLI(
    'my-app',        // Name
    '1.0.0',         // Version
    'My awesome CLI' // Description
);

// Add a command
cli.addCommand(new Command(
    'hello',
    'Say hello to someone',
    (args, options) => {
        const name = options.name || 'World';
        console.log(`Hello, ${name}!`);
    },
    [
        {
            short: 'n',
            long: 'name',
            description: 'Name to greet',
            required: false
        }
    ]
));

// Parse command line arguments
cli.parse(process.argv.slice(2));
```

### Running Your App

```bash
# Build with TypeScript
tsc

# Run the app
node dist/index.js
node dist/index.js hello
node dist/index.js hello --name "Alice"
```

## Project Structure

A typical Emir project looks like this:

```
my-cli-app/
├── src/
│   ├── index.ts          # Main entry point
│   ├── commands/         # Command definitions
│   │   ├── build.ts
│   │   └── deploy.ts
│   └── utils/            # Helper functions
├── tests/                # Test files
├── docs/                 # Documentation
├── package.json
├── tsconfig.json
└── README.md
```

## Using the Scaffolding Tool

Emir includes a powerful scaffolding tool to generate project templates:

```bash
# Interactive mode
npx emir scaffold

# Quick creation
npx emir scaffold create my-project hybrid-app

# List available templates
npx emir scaffold list
```

### Available Templates

- **CLI App**: Basic command-line application
- **Hybrid App**: CLI with TUI support
- **Command**: Reusable CLI command
- **TUI Component**: Custom TUI component
- **Plugin**: Plugin for extending functionality

## Adding More Commands

### Global Options

Add options that apply to all commands:

```typescript
cli.addGlobalOption({
    short: 'v',
    long: 'verbose',
    description: 'Enable verbose output'
});

cli.addGlobalOption({
    short: 'c',
    long: 'config',
    description: 'Config file path',
    value: 'path'
});
```

### Subcommands

Create commands with subcommands:

```typescript
const userCommand = new Command('user', 'User management');

userCommand.addSubcommand(new Command(
    'create',
    'Create a new user',
    async (args, options) => {
        // Create user logic
    }
));

userCommand.addSubcommand(new Command(
    'list',
    'List all users',
    async (args, options) => {
        // List users logic
    }
));

cli.addCommand(userCommand);
```

### Async Commands

Commands can be asynchronous:

```typescript
cli.addCommand(new Command(
    'fetch',
    'Fetch data from API',
    async (args, options) => {
        const response = await fetch('https://api.example.com/data');
        const data = await response.json();
        console.log(data);
    }
));
```

## Error Handling

Emir provides built-in error handling:

```typescript
cli.addCommand(new Command(
    'risky',
    'A command that might fail',
    async (args, options) => {
        try {
            // Risky operation
            await doSomethingRisky();
        } catch (error) {
            console.error('Operation failed:', error.message);
            // Emir will handle the error gracefully
            throw error;
        }
    }
));

// Set global error handler
cli.onError((error, command) => {
    console.error(`Error in command ${command}:`, error);
    // Log to your error tracking service
});
```

## Configuration

### Environment Variables

```typescript
const cli = new CLI('my-app', '1.0.0', 'My CLI');

// Load from environment
const config = {
    apiKey: process.env.API_KEY,
    debug: process.env.DEBUG === 'true'
};
```

### Config Files

```typescript
import { readFile } from 'fs/promises';
import { join } from 'path';

async function loadConfig() {
    try {
        const configPath = join(process.cwd(), 'my-app.config.json');
        const content = await readFile(configPath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return {};
    }
}

// Use in CLI
const config = await loadConfig();
```

## Testing

Emir makes testing easy:

```typescript
// test/hello.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CLI } from 'emir';

describe('hello command', () => {
    let cli: CLI;

    beforeEach(() => {
        cli = new CLI('test-app', '1.0.0', 'Test app');
    });

    it('should say hello to World', async () => {
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => logs.push(args.join(' '));

        cli.addCommand(new Command(
            'hello',
            'Say hello',
            () => console.log('Hello, World!')
        ));

        cli.parse(['hello']);

        console.log = originalLog;
        expect(logs).toContain('Hello, World!');
    });
});
```

## Next Steps

Now that you've learned the basics, explore:

- [Building TUI Applications](./tui-basics.md)
- [Advanced Command Patterns](./advanced-commands.md)
- [Testing Strategies](./testing.md)
- [Performance Optimization](./performance.md)
- [Deployment and Distribution](./deployment.md)

## Resources

- [API Reference](../api/)
- [Examples](../examples/)
- [Recipes](../recipes/)
- [Architecture Guide](../architecture/)