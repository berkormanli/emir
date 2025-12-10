# Examples Directory

This directory contains ready-to-run examples that demonstrate various features of the Emir CLI framework.

## 🚀 Quick Start Examples

### [Basic CLI Application](./basic-cli/)
A minimal CLI application showing core concepts:
- Command creation
- Argument parsing
- Help generation

```bash
cd examples/basic-cli
npm install
npm start
```

### [Hybrid CLI/TUI App](./hybrid-app/)
An application that works in both CLI and TUI modes:
- Mode switching
- Interactive forms
- Menu navigation

```bash
cd examples/hybrid-app
npm install
npm start
# Try with: npm start -- --interactive
```

## 🎨 TUI Examples

### [Component Showcase](./component-showcase/)
All TUI components in action:
- Forms, tables, menus
- Charts and progress bars
- Layout demonstrations

```bash
cd examples/component-showcase
npm install
npm start
```

### [Real-time Dashboard](./dashboard/)
A real-time monitoring dashboard:
- Live data updates
- Multiple charts
- Performance metrics

```bash
cd examples/dashboard
npm install
npm start
```

### [Interactive Form Builder](./form-builder/)
Build forms with a visual interface:
- Drag-and-drop interface
- Field customization
- Form preview

```bash
cd examples/form-builder
npm install
npm start
```

## 🛠️ Advanced Examples

### [Plugin System](./plugin-system/)
Demonstrates the plugin architecture:
- Plugin registration
- Dynamic loading
- Event communication

```bash
cd examples/plugin-system
npm install
npm start
```

### [Custom Components](./custom-components/)
Creating custom TUI components:
- Component lifecycle
- Event handling
- State management

```bash
cd examples/custom-components
npm install
npm start
```

### [Performance Monitoring](./performance-monitor/)
Built-in performance monitoring:
- Metrics collection
- Real-time graphs
- Diagnostic tools

```bash
cd examples/performance-monitor
npm install
npm start
```

## 📊 Data Processing Examples

### [Batch File Processor](./batch-processor/)
Process multiple files with progress:
- File selection
- Batch operations
- Progress tracking

```bash
cd examples/batch-processor
npm install
npm start -- --input ./files --output ./processed
```

### [Database Manager](./database-manager/)
Interactive database management:
- Query builder
- Result visualization
- Export functionality

```bash
cd examples/database-manager
npm install
npm start
```

## 🎮 Interactive Examples

### [Terminal Game](./terminal-game/)
A simple terminal game:
- Game loop
- Input handling
- Score tracking

```bash
cd examples/terminal-game
npm install
npm start
```

### [Interactive Tutorial](./interactive-tutorial/)
Learn Emir through an interactive tutorial:
- Step-by-step guidance
- Live code examples
- Hands-on exercises

```bash
cd examples/interactive-tutorial
npm install
npm start
```

## 🔧 Development Tools Examples

### [CLI Generator](./cli-generator/)
Generate new CLI projects:
- Template selection
- Project configuration
- File generation

```bash
cd examples/cli-generator
npm install
npm start create my-new-cli
```

### [Testing Suite](./testing-suite/)
Comprehensive testing examples:
- Unit tests
- Integration tests
- Mock utilities

```bash
cd examples/testing-suite
npm install
npm test
```

## Running Examples

### Prerequisites

All examples require:
- Node.js 16+ or Bun
- TypeScript 5+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/emir.git
cd emir

# Install dependencies
npm install

# Build the framework
npm run build
```

### Running an Example

```bash
# Navigate to the example directory
cd examples/[example-name]

# Install example dependencies
npm install

# Run the example
npm start

# Or run directly with Bun
bun run src/index.ts
```

## Contributing Examples

We welcome contributions! To add a new example:

1. Create a new directory in `examples/`
2. Add a `README.md` with description and usage
3. Include a `package.json` with example dependencies
4. Add the example to this index
5. Ensure it works with the latest framework version

### Example Structure

```
examples/my-example/
├── README.md          # Description and usage
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── src/              # Source code
│   └── index.ts      # Entry point
└── screenshots/      # Optional screenshots
```

## Need Help?

- 📖 Check the [Guides](../guides/) for step-by-step tutorials
- 🍳 Browse the [Recipes](../recipes/) for quick solutions
- 📋 Review the [API Reference](../api/) for detailed documentation
- 🐛 [Report Issues](https://github.com/your-org/emir/issues) on GitHub