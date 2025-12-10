# Runtime & Input Core Documentation

The Runtime & Input Core provides a comprehensive set of systems for building high-performance, reactive TUI applications with advanced input handling, state management, and diagnostics.

## Overview

The Runtime Core integrates several subsystems:

1. **Enhanced Input Manager** - Normalized key/mouse handling with keymaps and macros
2. **Focus Manager** - Advanced focus management with proper event routing
3. **Scheduler/Animation Loop** - High-performance task scheduling and animations
4. **Event Bus** - Inter-component communication system
5. **State Store** - Centralized reactive state management
6. **Diagnostics** - Runtime error tracking and performance monitoring

## Quick Start

```typescript
import { RuntimeCore } from 'emir/tui';

// Create runtime with diagnostics
const runtime = new RuntimeCore({
    enableDiagnostics: true,
    enableMetrics: true,
    targetFPS: 60
});

// Initialize and start
await runtime.initialize();
await runtime.start();

// Register components
runtime.registerComponent(myComponent);

// Handle input events
await runtime.handleInput(inputEvent);
```

## Enhanced Input Manager

### Features

- **Keymaps**: Define custom keyboard mappings and modes
- **Macros**: Record and playback sequences of input events
- **Modes**: Switch between different input contexts (e.g., normal, insert)
- **Input Logging**: Debug input events with detailed logging

### Usage

```typescript
// Register custom keymap
const vimKeymap = {
    name: 'vim',
    bindings: new Map([
        ['h', { command: 'move-left' }],
        ['j', { command: 'move-down' }],
        ['k', { command: 'move-up' }],
        ['l', { command: 'move-right' }],
        [':', { command: 'command-mode' }]
    ])
};

runtime.inputManager.registerKeymap('vim', vimKeymap);
runtime.inputManager.setActiveKeymap('vim');

// Create input mode
runtime.inputManager.registerMode({
    name: 'vim-normal',
    keymap: vimKeymap,
    hooks: {
        onEnter: () => console.log('Vim mode entered'),
        onExit: () => console.log('Vim mode exited')
    }
});

// Record and play macros
runtime.inputManager.startRecordingMacro('demo-macro');
// ... perform actions ...
runtime.inputManager.stopRecordingMacro();
runtime.inputManager.playMacro('demo-macro');
```

### Key Bindings

```typescript
interface KeyBinding {
    command?: string;          // Command to execute
    sequence?: string[];       // Multi-key sequence
    macro?: string[];          // Macro to execute
    repeat?: boolean;          // Allow repetition
    condition?: (context) => boolean; // Conditional binding
}
```

## Focus Manager

### Features

- **Focus Containers**: Organize components into focusable groups
- **Focus Cycling**: Navigate between components with Tab/Shift+Tab
- **Directional Navigation**: Arrow key navigation in grids
- **Modal Support**: Handle focus in modal dialogs
- **Focus Events**: Track focus changes with events

### Usage

```typescript
// Create focus container
runtime.focusManager.createContainer('main-form', true, true);

// Add component to container
runtime.focusManager.addComponent(textInput, 'main-form', 1);

// Handle focus events
runtime.focusManager.addFocusEventListener(
    'focus',
    (event) => {
        console.log(`Component ${event.target.id} focused`);
    }
);

// Programmatic focus
runtime.focusManager.focusComponent(textInput);

// Directional navigation
runtime.focusManager.moveFocus(FocusDirection.Up);
```

### Focus Policies

```typescript
runtime.focusManager.setFocusPolicy(
    FocusPolicy.Tab,      // Tab navigation
    FocusPolicy.Click,    // Mouse clicks
    FocusPolicy.Programmatic // Manual focus changes
);
```

## Scheduler

### Features

- **Task Priorities**: 5 priority levels for task scheduling
- **Animation System**: Smooth animations with easing functions
- **Frame Throttling**: Prevent excessive updates
- **Performance Metrics**: Track frame rate and execution time

### Usage

```typescript
// Schedule one-time task
const taskId = runtime.scheduler.scheduleTask(
    () => console.log('Task executed'),
    TaskPriority.High,
    1000 // 1 second delay
);

// Schedule repeating task
runtime.scheduler.scheduleRepeatingTask(
    () => updateData(),
    5000, // Every 5 seconds
    10,   // 10 times
    TaskPriority.Normal
);

// Animate property
runtime.scheduler.animate(
    component,
    'progress',
    0,      // From value
    100,    // To value
    2000,   // Duration (ms)
    EasingFunction.EaseOut,
    (value) => component.progress = value,
    () => console.log('Animation complete')
);

// Throttle function calls
const throttledUpdate = runtime.scheduler.throttle(
    () => updateUI(),
    60 // 60 FPS
);
```

### Easing Functions

- Linear, EaseIn, EaseOut, EaseInOut
- EaseInQuad, EaseOutQuad
- EaseInCubic, EaseOutCubic
- Bounce, Elastic

## Event Bus

### Features

- **Type-safe Events**: Strongly typed event system
- **Event Priorities**: Control event processing order
- **Conditional Listeners**: Subscribe based on conditions
- **Event Filtering**: Filter events before processing
- **Event History**: Track all events for debugging

### Usage

```typescript
// Subscribe to events
runtime.eventBus.subscribe(
    EventType.ComponentStateChanged,
    (event) => {
        console.log('Component state changed:', event.data);
    },
    {
        priority: EventPriority.High,
        filter: (event) => event.source === myComponent
    }
);

// Emit events
await runtime.eventBus.emit(
    EventType.UserAction,
    { action: 'save', data: formData },
    myComponent,
    { priority: EventPriority.High }
);

// Use middleware
runtime.eventBus.use((event, next) => {
    console.log('Processing event:', event.type);
    next();
});
```

## State Store

### Features

- **Reactive Updates**: Automatic UI updates on state changes
- **Selective Subscriptions**: Subscribe to specific state paths
- **Time Travel**: Navigate through state history
- **State Validation**: Validate state mutations
- **Persistence**: Export/import state snapshots

### Usage

```typescript
// Subscribe to state changes
runtime.stateStore.subscribe(
    ['user', 'profile'],
    (state) => updateProfileUI(state),
    { component: profileComponent }
);

// Update state
await runtime.stateStore.set(['user', 'name'], 'John');
await runtime.stateStore.merge(['settings'], {
    theme: 'dark',
    fontSize: 14
});

// Batch updates
await runtime.stateStore.batch(async () => {
    await stateStore.set(['loading'], true);
    await stateStore.delete(['errors']);
    await stateStore.push(['history'], action);
});

// Time travel
const snapshotId = runtime.stateStore.createSnapshot('Before save');
// ... make changes ...
await runtime.stateStore.restoreSnapshot(snapshotId);
```

### Mutation Types

- Set - Replace value at path
- Update - Transform existing value
- Delete - Remove property
- Merge - Merge objects
- Push/Pop/Shift/Unshift - Array operations
- Splice - Array splice operation

## Diagnostics

### Features

- **Error Tracking**: Capture and categorize errors
- **Performance Monitoring**: Track FPS, memory, and render times
- **Memory Snapshots**: Monitor memory usage over time
- **Error Overlays**: Visual error display in TUI
- **Performance Counters**: Real-time performance display

### Usage

```typescript
// Log diagnostics
runtime.diagnostics.error(
    DiagnosticCategory.Network,
    'Failed to fetch data',
    apiComponent,
    new Error('Network timeout')
);

runtime.diagnostics.warning(
    DiagnosticCategory.Performance,
    'Slow render detected',
    'renderer',
    { frameTime: 45 }
);

// Configure error overlay
runtime.diagnostics.configureErrorOverlay({
    enabled: true,
    maxErrors: 10,
    showStackTrace: true
});

// Configure performance counter
runtime.diagnostics.configurePerfCounter({
    enabled: true,
    position: 'top-right',
    showFPS: true,
    showMemory: true
});

// Generate report
console.log(runtime.diagnostics.generateReport());
```

## Configuration

```typescript
interface RuntimeCoreConfig {
    enableDiagnostics?: boolean;    // Enable diagnostics system
    enableMetrics?: boolean;        // Collect performance metrics
    enableLogging?: boolean;        // Enable verbose logging
    targetFPS?: number;            // Target frame rate (default: 60)
    maxHistorySize?: number;       // Event history size
    maxQueueSize?: number;         // Event queue max size
}
```

## Best Practices

### Performance

1. **Use Selective Subscriptions**: Only subscribe to state paths you need
2. **Batch State Updates**: Group multiple updates together
3. **Throttle Expensive Operations**: Use the scheduler's throttle/debounce
4. **Monitor Performance**: Enable diagnostics to track issues

### Input Handling

1. **Organize Keymaps**: Group related commands in keymaps
2. **Use Modes**: Separate normal/insert/edit modes
3. **Record Macros**: Automate repetitive user actions
4. **Validate Input**: Use state validators for form inputs

### Error Handling

1. **Catch All Errors**: Use event bus error subscription
2. **Categorize Errors**: Use diagnostic categories
3. **Provide Context**: Include component and stack information
4. **Recover Gracefully**: Implement error boundaries

## API Reference

See the TypeScript definitions for complete API documentation:

- `RuntimeCore` - Main runtime orchestrator
- `EnhancedInputManager` - Advanced input handling
- `FocusManager` - Focus management system
- `Scheduler` - Task and animation scheduling
- `EventBus` - Event communication
- `StateStore` - Reactive state management
- `RuntimeDiagnostics` - Error tracking and monitoring