# TUI Examples

This directory contains examples demonstrating the TUI (Text User Interface) functionality.

## Basic TUI Example

Run the basic TUI example:

```bash
bun examples/tui-basic.ts
```

This example demonstrates:
- Terminal capability detection
- Basic component rendering
- Terminal resize handling
- Input handling (Ctrl+C and ESC to exit)
- Real-time terminal size updates

## Features Demonstrated

### Terminal Control
- Raw mode handling
- Alternate screen buffer
- Cursor control and visibility
- Screen clearing and positioning

### Input Handling
- Ctrl+C (ASCII 3) for graceful exit
- ESC key for alternative exit
- Input routing to components

### Resize Handling
- Automatic re-rendering on terminal resize
- Real-time terminal size updates

### Component System
- Basic component interface
- Position-based rendering
- Component updates and re-rendering

## Controls

- **Ctrl+C**: Exit the TUI application
- **ESC**: Alternative exit method
- **Terminal resize**: Automatically updates display

## Requirements

- Terminal with TUI support (most modern terminals)
- Color support (optional but recommended)
- Unicode support (optional but recommended)