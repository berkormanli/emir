# Emir CLI Framework Documentation

Welcome to the Emir CLI Framework documentation. Emir is a comprehensive framework for building powerful command-line applications with optional TUI (Terminal User Interface) support.

## Quick Start

```bash
npm install emir
```

```typescript
import { CLI, Command } from 'emir';

const cli = new CLI('my-app', '1.0.0', 'My awesome CLI app');

cli.addCommand(new Command(
    'hello',
    'Say hello',
    (args, options) => {
        console.log('Hello, World!');
    }
));

cli.parse(process.argv.slice(2));
```

## Documentation Structure

### 📚 [Getting Started](./guides/getting-started.md)
Learn the basics of building CLI applications with Emir.

### 🏗️ [Architecture](./architecture/)
Understand the framework's architecture and design principles.

### 📖 [Guides](./guides/)
In-depth guides for common use cases and advanced features.

### 🍳 [Recipes](./recipes/)
Quick, copy-paste solutions for common tasks.

### 💡 [Examples](./examples/)
Ready-to-run examples demonstrating framework capabilities.

### 📋 [API Reference](./api/)
Complete API documentation generated from source code.

## Key Features

- **🚀 Fast & Lightweight**: Built for performance with minimal overhead
- **🎨 Rich TUI Support**: Beautiful terminal interfaces with extensive component library
- **🔄 Hybrid CLI/TUI**: Seamlessly switch between CLI and TUI modes
- **🛠️ Developer Tools**: Built-in scaffolding, testing, and debugging utilities
- **📊 Performance Monitoring**: Real-time performance diagnostics and profiling
- **🎯 Accessibility**: Screen reader support and keyboard navigation
- **🌙 Theming**: Built-in light/dark themes with custom theming support

## What's New

### Version 0.0.1

- ✨ Comprehensive TUI component library
- 🎯 Runtime core with advanced input management
- 🏗️ CLI scaffolding tool for rapid development
- 📊 Performance diagnostics and monitoring
- 🎨 Advanced theming and accessibility features

## Need Help?

- 📖 Check our [Guides](./guides/) for step-by-step tutorials
- 🍳 Browse our [Recipes](./recipes/) for quick solutions
- 💡 Explore [Examples](./examples/) for inspiration
- 🐛 [Report Issues](https://github.com/your-org/emir/issues) on GitHub
- 💬 Join our [Discord Community](https://discord.gg/emir)

## Contributing

We welcome contributions! See our [Contributing Guide](./contributing.md) for details.

## License

MIT License - see [LICENSE](https://github.com/your-org/emir/blob/main/LICENSE) for details.