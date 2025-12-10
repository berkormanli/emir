# emir
A small, lightweight CLI building library written for Bun, with Bun.

## Features

- Simple command registration with options support
- Argument and option parsing (short and long flags)
- Built-in help and version commands
- Command-specific help
- Configurable global options
- Default values for options
- Boolean and value-based options

## Usage

### Basic CLI Setup

```typescript
import { CLI, Command } from './src/index';

const cli = new CLI('MyApp', '1.0.0', 'A sample CLI application');
```

### Adding Global Options

```typescript
// Add custom global options
cli.addGlobalOption({
    short: 'c',
    long: 'config',
    description: 'Specify config file path',
    hasValue: true,
    defaultValue: './config.json'
});
```

### Creating Commands with Options

```typescript
const buildCommand = new Command('build', 'Build the project', (args, options) => {
    console.log('Building project...');
    console.log('Arguments:', args);
    console.log('Options:', options);
    
    if (options.watch) {
        console.log('Watch mode enabled');
    }
    
    if (options.output) {
        console.log(`Output directory: ${options.output}`);
    }
});

// Add options to the command
buildCommand.addOption({
    short: 'w',
    long: 'watch',
    description: 'Enable watch mode'
});

buildCommand.addOption({
    short: 'o',
    long: 'output',
    description: 'Specify output directory',
    hasValue: true,
    defaultValue: './dist'
});

cli.addCommand(buildCommand);
```

### Option Types

- **Boolean options**: No value required, presence indicates true
- **Value options**: Require a value, specified with `hasValue: true`
- **Default values**: Set with `defaultValue` property

### Help System

- Global help: `myapp --help` or `myapp -h`
- Command help: `myapp build --help` or `myapp build -h`
- Version: `myapp --version` or `myapp -v`

### Example Usage

```bash
# Show global help
myapp --help

# Show command-specific help
myapp build --help

# Run command with options
myapp build --watch --output ./custom-dist src/main.js

# Using short flags
myapp build -w -o ./custom-dist src/main.js
```
