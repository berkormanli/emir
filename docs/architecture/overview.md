# Architecture Overview

Emir follows a layered, modular architecture designed for flexibility, performance, and maintainability. This document provides a comprehensive overview of the system's architecture and design principles.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   CLI Apps  │  │ Hybrid Apps │  │    TUI Apps        │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                    Framework Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │   CLI Core  │  │ Hybrid CLI  │  │    Scaffolding      │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     TUI Layer                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │ Components  │  │   Layout    │  │     Rendering       │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Runtime Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │    Input    │  │    State    │  │   Diagnostics       │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Platform Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐   │
│  │  Terminal   │  │   Process   │  │      File System    │   │
│  └─────────────┘  └─────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Separation of Concerns

Each layer has a specific responsibility:
- **CLI Layer**: Command parsing, argument handling, help generation
- **TUI Layer**: Component rendering, layout management, user interaction
- **Runtime Layer**: State management, input handling, performance monitoring
- **Platform Layer**: Terminal control, process management, file I/O

### 2. Modularity

- **Loose Coupling**: Components communicate through well-defined interfaces
- **High Cohesion**: Related functionality is grouped together
- **Pluggable Architecture**: Easy to extend with custom components and commands

### 3. Performance First

- **Efficient Rendering**: Dirty tracking and virtualization for large datasets
- **Lazy Loading**: Commands and components loaded on demand
- **Memory Management**: Automatic cleanup and garbage collection

### 4. Developer Experience

- **TypeScript First**: Full type safety and IntelliSense support
- **Rich Documentation**: Comprehensive JSDoc comments and examples
- **Developer Tools**: Built-in debugging, profiling, and scaffolding

## Detailed Component Architecture

### CLI Core (`src/index.ts`)

```typescript
CLI
├── Command Registry
│   ├── Commands
│   ├── Subcommands
│   └── Global Options
├── Argument Parser
│   ├── Short flags (-v)
│   ├── Long flags (--verbose)
│   └── Value parsing
├── Help System
│   ├── Global help
│   ├── Command help
│   └── Auto-generation
└── Error Handler
    ├── Graceful errors
    ├── Suggestions
    └── Error recovery
```

### TUI Framework (`src/tui/`)

```typescript
TUI Framework
├── Component System
│   ├── BaseComponent
│   ├── State Management
│   ├── Lifecycle Hooks
│   └── Event System
├── Rendering Engine
│   ├── RenderEngine
│   ├── Dirty Tracking
│   ├── Virtualization
│   └── Buffer Management
├── Layout System
│   ├── Flex Layout
│   ├── Grid Layout
│   ├── Absolute Layout
│   └── Responsive Design
└── Component Library
    ├── Forms & Inputs
    ├── Navigation
    ├── Data Display
    └── Feedback
```

### Runtime Core (`src/tui/runtime-core.ts`)

```typescript
Runtime System
├── Input Management
│   ├── EnhancedInputManager
│   ├── Keymaps
│   ├── Macros
│   └── Gesture Recognition
├── State Management
│   ├── StateStore
│   ├── Reactive Updates
│   ├── Time Travel
│   └── Persistence
├── Event System
│   ├── EventBus
│   ├── Event Types
│   ├── Event Handlers
│   └── Event Queues
└── Diagnostics
    ├── Performance Metrics
    ├── Memory Profiling
    ├── Frame Rate Analysis
    └── Health Checks
```

## Data Flow

### Command Execution Flow

```
User Input
    │
    ▼
CLI Parser
    │
    ├─ Parse arguments
    ├─ Resolve command
    ├─ Validate options
    └─ Prepare context
    │
    ▼
Command Handler
    │
    ├─ Execute logic
    ├─ Handle errors
    ├─ Emit events
    └─ Update state
    │
    ▼
Output/Response
    │
    ├─ CLI Output
    ├─ TUI Update
    └─ State Change
```

### TUI Render Flow

```
Component State Change
    │
    ▼
Dirty Flag Set
    │
    ▼
Render Loop (60 FPS)
    │
    ├─ Collect dirty components
    ├─ Calculate layout
    ├─ Render to buffer
    ├─ Apply transformations
    └─ Flush to terminal
```

### Event Flow

```
User Action
    │
    ▼
Input Manager
    │
    ├─ Capture input
    ├─ Translate to events
    ├─ Apply keymaps
    └─ Trigger handlers
    │
    ▼
Event Bus
    │
    ├─ Queue events
    ├─ Route to listeners
    ├─ Handle propagation
    └─ Cleanup
```

## Design Patterns Used

### 1. Command Pattern

All CLI commands implement the Command interface:

```typescript
interface Command {
    name: string;
    description: string;
    execute(args: string[], options: Record<string, any>): void;
}
```

### 2. Observer Pattern

Components subscribe to state changes:

```typescript
class BaseComponent {
    subscribe(store: StateStore, selector: (state: State) => any) {
        // Subscribe to specific state changes
    }
}
```

### 3. Strategy Pattern

Different rendering strategies for different scenarios:

```typescript
interface RenderStrategy {
    render(components: Component[]): string;
}

class EfficientRenderStrategy implements RenderStrategy {
    // Only render dirty components
}
```

### 4. Factory Pattern

Component factory for creating UI elements:

```typescript
class ComponentFactory {
    static createForm(config: FormConfig): Form {
        return new Form(config);
    }
}
```

### 5. Builder Pattern

Fluent API for building complex UI:

```typescript
const form = new FormBuilder()
    .addTextField('name', 'Name', true)
    .addEmailField('email', 'Email')
    .addSelectField('role', 'Role', ['admin', 'user'])
    .build();
```

## Performance Optimizations

### 1. Rendering Optimizations

- **Dirty Tracking**: Only re-render changed components
- **Virtual Scrolling**: Render only visible items in large lists
- **Batch Updates**: Group multiple updates into single render cycle
- **Frame Throttling**: Limit to 60 FPS to prevent CPU overload

### 2. Memory Optimizations

- **Object Pooling**: Reuse objects instead of creating new ones
- **Weak References**: Allow garbage collection of unused components
- **Lazy Loading**: Load components on demand
- **Event Cleanup**: Automatic removal of event listeners

### 3. Input Optimizations

- **Input Debouncing**: Batch rapid input events
- **Keymap Caching**: Cache resolved keymap actions
- **Gesture Recognition**: Efficient pattern matching for gestures

## Security Considerations

### 1. Input Sanitization

- All user input is sanitized before processing
- XSS prevention in TUI rendering
- Path traversal protection in file operations

### 2. Permission Handling

- Respect file system permissions
- Check terminal capabilities before use
- Validate command arguments

### 3. Error Information

- Don't expose sensitive information in errors
- Sanitize error messages
- Log detailed errors securely

## Testing Architecture

### 1. Unit Tests

- Individual component testing
- Mock dependencies
- Fast feedback loops

### 2. Integration Tests

- Command flow testing
- Component interaction testing
- End-to-end scenarios

### 3. Performance Tests

- Rendering benchmarks
- Memory usage monitoring
- Input latency measurement

## Extensibility Points

### 1. Custom Commands

```typescript
class CustomCommand implements Command {
    // Custom command implementation
}

cli.addCommand(new CustomCommand());
```

### 2. Custom Components

```typescript
class CustomComponent extends BaseComponent {
    // Custom component implementation
}

tui.addComponent(new CustomComponent());
```

### 3. Plugins

```typescript
interface Plugin {
    register(cli: CLI): void;
}

const plugin: Plugin = {
    register(cli) {
        // Plugin registration
    }
};
```

### 4. Themes

```typescript
const customTheme: Theme = {
    colors: { /* custom colors */ },
    styles: { /* custom styles */ }
};

tui.setTheme(customTheme);
```

## Future Architecture Considerations

### 1. WebAssembly Integration

- Performance-critical components in WebAssembly
- SIMD optimizations for data processing
- Cross-platform compatibility

### 2. Plugin Ecosystem

- Package manager for plugins
- Plugin sandboxing
- Dynamic plugin loading

### 3. Distributed Architecture

- Remote command execution
- Distributed state management
- Cloud-based services integration

### 4. AI/ML Integration

- Intelligent command suggestions
- Natural language processing
- Predictive UI

## Conclusion

Emir's architecture is designed to be:

- **Scalable**: Handle applications from simple scripts to complex TUIs
- **Maintainable**: Clear separation of concerns and modular design
- **Performant**: Optimized for speed and memory efficiency
- **Extensible**: Easy to add new features and capabilities
- **Developer-Friendly**: Rich APIs and comprehensive documentation

This architecture enables developers to build sophisticated command-line applications with minimal effort while maintaining high performance and code quality.