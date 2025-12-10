# Harare TUI Component Library

A comprehensive terminal UI component library for Bun, featuring modern widgets and rich interactive elements.

## Overview

The Harare Component Library provides a wide range of TUI components organized into several categories:

- **Navigation Components** - Tab bars, accordions, breadcrumbs, status bars, and sidebars
- **Form Components** - Rich form controls with schema-driven validation
- **Productivity Widgets** - Trees, command palettes, log viewers, and toast notifications
- **Chart Components** - Various chart types for data visualization
- **Composite Widgets** - Complex components like split panes, tabbed windows, and dashboards

## Installation

```bash
bun add harare
```

## Quick Start

```typescript
import { TUI, TabBar, StatusBar } from 'harare';

const tui = new TUI();

// Create a tab bar
const tabBar = new TabBar('main-tabs', { x: 0, y: 0 }, { width: 80, height: 1 });
tabBar.addTab({ id: 'home', label: 'Home' });
tabBar.addTab({ id: 'about', label: 'About' });

// Create a status bar
const statusBar = new StatusBar('status', { x: 0, y: 23 }, { width: 80, height: 1 });
statusBar.addItem({
    id: 'status',
    text: 'Ready',
    position: 'left'
});

tui.addComponent(tabBar);
tui.addComponent(statusBar);

await tui.start();
```

## Component Categories

### Navigation Components

#### TabBar
A configurable tab bar with support for:
- Horizontal/vertical layouts
- Drag-and-drop reordering
- Icons and badges
- Close buttons
- Scrolling

```typescript
import { TabBar, Tab } from 'harare/components/navigation';

const tabBar = new TabBar('tabs', position, size, {
    draggable: true,
    showCloseButtons: true,
    maxTabWidth: 25
});

tabBar.addTab({
    id: 'home',
    label: 'Home',
    icon: '🏠',
    closable: false
});
```

#### Accordion
Collapsible sections with nested support:
- Multiple expansion modes
- Smooth animations
- Nested items
- Custom icons

```typescript
import { Accordion } from 'harare/components/navigation';

const accordion = new Accordion('nav', position, size, {
    multiple: true,
    showIcons: true
});

accordion.addItem({
    id: 'section1',
    title: 'Section 1',
    content: 'Content here',
    icon: '📁'
});
```

#### Breadcrumb
Navigation breadcrumb with dropdowns:
- Collapsible overflow
- Dropdown menus
- Custom separators
- Interactive items

```typescript
import { Breadcrumb } from 'harare/components/navigation';

const breadcrumb = new Breadcrumb('breadcrumbs', position, size, {
    separator: '›',
    maxItems: 5
});
```

#### StatusBar
Flexible status bar with multiple sections:
- Left/center/right positioning
- Progress bars
- Action buttons
- Auto-hide functionality

```typescript
import { StatusBar } from 'harare/components/navigation';

const statusBar = new StatusBar('status', position, size, {
    showProgressBar: true,
    clickable: true
});
```

#### Sidebar
Dockable sidebar with resizable panels:
- Collapsible sections
- Keyboard navigation
- Icon support
- Resize handles

```typescript
import { Sidebar } from 'harare/components/navigation';

const sidebar = new Sidebar('sidebar', position, size, {
    resizable: true,
    collapsible: true,
    showIcons: true
});
```

### Form Components

#### Enhanced Form with Schema Validation
Rich form system with:
- Schema-driven validation
- Conditional fields
- Multiple input types
- Real-time validation

```typescript
import { EnhancedForm, FormSchema } from 'harare/components/forms';

const schema: FormSchema = {
    fields: [
        {
            type: 'text',
            name: 'name',
            label: 'Name',
            validation: [
                { type: 'required', message: 'Required' }
            ]
        },
        {
            type: 'email',
            name: 'email',
            label: 'Email'
        }
    ]
};

const form = new EnhancedForm('form', position, size, schema);
```

#### DatePicker
Advanced date picker with:
- Multiple formats
- Calendar view
- Keyboard navigation
- Range selection

```typescript
import { DatePicker } from 'harare/components/forms';

const datePicker = new DatePicker('date', position, size, {
    format: 'YYYY-MM-DD',
    showWeekNumbers: true
});
```

#### ColorPicker
Color selection widget with:
- Multiple color formats
- Palette support
- RGB/HSL controls
- Preview

```typescript
import { ColorPicker } from 'harare/components/forms';

const colorPicker = new ColorPicker('color', position, size, {
    format: 'hex',
    showPalette: true
});
```

#### RichTextEditor
Feature-rich text editor:
- Formatting options
- Syntax highlighting
- Undo/redo
- Search and replace

```typescript
import { RichTextEditor } from 'harare/components/forms';

const editor = new RichTextEditor('editor', position, size, {
    wordWrap: true,
    lineNumbers: true
});
```

### Productivity Widgets

#### Tree
Hierarchical tree view with:
- Virtual scrolling
- Multi-selection
- Lazy loading
- Drag and drop

```typescript
import { Tree } from 'harare/components/productivity';

const tree = new Tree('file-tree', position, size, {
    multiSelect: true,
    virtualScrolling: true
});

tree.addItem({
    id: 'root',
    label: 'Root',
    children: [...]
});
```

#### CommandPalette
Searchable command palette:
- Fuzzy search
- Keyboard shortcuts
- Command history
- Recent commands

```typescript
import { CommandPalette } from 'harare/components/productivity';

const palette = new CommandPalette('palette', position, size, {
    placeholder: 'Type a command...',
    showShortcuts: true
});

palette.registerCommand({
    id: 'save',
    title: 'Save File',
    shortcut: ['Ctrl+S'],
    action: () => saveFile()
});
```

#### LogViewer
Advanced log viewing:
- Log level filtering
- Search and highlighting
- Export functionality
- Real-time updates

```typescript
import { LogViewer, LogLevel } from 'harare/components/productivity';

const logViewer = new LogViewer('logs', position, size, {
    showTimestamp: true,
    followTail: true
});

logViewer.addLogMessage(LogLevel.INFO, 'Application started');
```

#### Toast System
Notification system with:
- Queue management
- Multiple types
- Auto-dismiss
- Progress indicators

```typescript
import { ToastManager, ToastType } from 'harare/components/productivity';

const toastManager = ToastManager.getInstance();
toastManager.success('Operation completed!');
toastManager.error('Something went wrong');
```

### Chart Components

#### StackedAreaChart
Multi-series area chart:
- Stacked/overlaid modes
- Real-time updates
- Zoom and pan
- Tooltips

```typescript
import { StackedAreaChart } from 'harare/components/charts';

const chart = new StackedAreaChart('area', position, size, {
    stacked: true,
    showGrid: true
});

chart.addSeries({
    name: 'Series 1',
    data: [...]
});
```

#### ScatterChart
Scatter and bubble charts:
- Regression lines
- Multiple series
- Zoom capabilities
- Statistical info

```typescript
import { ScatterChart } from 'harare/components/charts';

const chart = new ScatterChart('scatter', position, size, {
    showRegression: true,
    enableZoom: true
});
```

#### Heatmap
Data heatmap visualization:
- Custom color scales
- Interpolation
- Value tooltips
- Configurable cells

```typescript
import { Heatmap } from 'harare/components/charts';

const heatmap = new Heatmap('heat', position, size, {
    showScale: true,
    interpolation: 'linear'
});
```

#### GaugeChart
Dashboard gauge widgets:
- Circular/linear styles
- Animated transitions
- Threshold indicators
- Multiple zones

```typescript
import { GaugeChart } from 'harare/components/charts';

const gauge = new GaugeChart('gauge', position, size, {
    orientation: 'circular',
    showValue: true,
    animate: true
});

gauge.setValue(75);
```

#### StreamingChart
Real-time data visualization:
- Data buffering
- Statistics
- Auto-scrolling
- Performance metrics

```typescript
import { StreamingChart } from 'harare/components/charts';

const stream = new StreamingChart('stream', position, size, {
    bufferSize: 100,
    updateInterval: 1000,
    showStats: true
});

stream.addDataPoint(Math.random() * 100);
```

### Composite Widgets

#### SplitPane
Resizable split panels:
- Horizontal/vertical
- Collapsible panels
- Keyboard shortcuts
- Smooth resizing

```typescript
import { SplitPane } from 'harare/components/composite';

const splitPane = new SplitPane('split', position, size, {
    orientation: 'vertical',
    resizable: true,
    collapsible: true
});

splitPane.setFirstPane(component1);
splitPane.setSecondPane(component2);
```

#### TabbedWindow
Window with tabs:
- Drag-and-drop tabs
- Closable tabs
- Keyboard navigation
- Tab overflow

```typescript
import { TabbedWindow } from 'harare/components/composite';

const tabWindow = new TabbedWindow('window', position, size, {
    draggableTabs: true,
    showCloseButtons: true
});

tabWindow.addTab({
    id: 'tab1',
    title: 'Tab 1',
    content: component
});
```

#### DraggableList
Reorderable list component:
- Drag and drop
- Multi-selection
- Virtual scrolling
- Custom items

```typescript
import { DraggableList } from 'harare/components/composite';

const list = new DraggableList('list', position, size, {
    sortable: true,
    multiSelect: true,
    showHandles: true
});

list.addItem({
    id: 'item1',
    text: 'Item 1',
    icon: '📄'
});
```

#### DashboardGrid
Widget dashboard system:
- Grid-based layout
- Resizable widgets
- Drag and drop
- Widget management

```typescript
import { DashboardGrid } from 'harare/components/composite';

const dashboard = new DashboardGrid('dash', position, size, {
    columns: 4,
    rows: 6,
    snapToGrid: true
});

dashboard.addWidget({
    id: 'widget1',
    component: widget,
    x: 0,
    y: 0,
    width: 2,
    height: 2
});
```

## Styling and Theming

All components support the built-in theming system:

```typescript
import { ThemeManager, DARK_THEME, LIGHT_THEME } from 'harare/tui/theme';

const themeManager = ThemeManager.getInstance();
themeManager.setTheme(DARK_THEME);

// Or create a custom theme
themeManager.createCustomTheme('custom', 'dark', {
    colors: {
        primary: 12, // Custom color
        secondary: 13
    }
});
```

## Keyboard Shortcuts

Common keyboard shortcuts across components:

- `Tab` - Navigate between elements
- `Arrow Keys` - Navigate within components
- `Enter` - Activate/select
- `Escape` - Cancel/close
- `Ctrl+C` - Copy
- `Ctrl+V` - Paste
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo

Component-specific shortcuts are documented in each component's usage.

## Best Practices

1. **Performance**: Use virtual scrolling for large datasets
2. **Accessibility**: Provide keyboard navigation for all interactive elements
3. **Consistency**: Use consistent styling across your application
4. **Error Handling**: Implement proper error states and validation
5. **Responsive**: Design layouts that adapt to different terminal sizes

## Examples

See the `examples/` directory for complete working examples:

- `component-library-demo.ts` - Comprehensive demo of all components
- `tui-basic.ts` - Basic TUI setup
- `hybrid-cli-example.ts` - CLI with TUI integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add your component with tests
4. Update documentation
5. Submit a pull request

## License

MIT License - see LICENSE file for details.