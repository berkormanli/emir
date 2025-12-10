#!/usr/bin/env bun
/**
 * Rendering & Layout Engine Demo
 * Demonstrates advanced rendering, layout, and virtualization features
 */

import { TUI } from '../src/tui/index.js';
import { AdvancedContainer } from '../src/tui/advanced-container.js';
import { EnhancedWindowManager } from '../src/tui/enhanced-window-manager.js';
import { VirtualizedList, VirtualizedTable, VirtualizedLog } from '../src/tui/virtualized-renderer.js';
import { Window } from '../src/tui/window.js';
import { Box } from '../src/tui/box.js';

async function main() {
    // Create TUI instance with enhanced rendering
    const tui = new TUI(
        'Rendering & Layout Demo',
        '1.0.0',
        'Advanced rendering and layout engine demonstration'
    );

    await tui.start();

    // Get terminal size
    const terminalSize = tui.getTerminalSize();

    // Create enhanced window manager
    const windowManager = new EnhancedWindowManager('main-window-manager', {
        snapZones: {
            enabled: true,
            threshold: 10,
            snapToEdges: true,
            snapToCorners: true
        },
        enableTiling: true
    }, terminalSize);

    tui.addComponent(windowManager);

    // Demo 1: Advanced Container Layout
    const layoutDemo = new Window('layout-demo', {
        title: 'Advanced Layout Demo',
        width: 60,
        height: 20
    });

    const container = new AdvancedContainer('demo-container', { x: 1, y: 2 }, { width: 58, height: 16 });

    // Create child components with different constraints
    const box1 = new Box('box1', {
        title: 'Flex Item 1',
        border: 'single',
        padding: 1
    });
    box1.size = { width: 20, height: 3 };

    const box2 = new Box('box2', {
        title: 'Flex Item 2',
        border: 'double',
        padding: 1
    });
    box2.size = { width: 20, height: 3 };

    const box3 = new Box('box3', {
        title: 'Flex Item 3',
        border: 'rounded',
        padding: 1
    });
    box3.size = { width: 20, height: 3 };

    // Add children with layout constraints
    container.addChild(box1, {
        constraints: {
            flex: true,
            flexGrow: 1,
            minWidth: 15
        },
        margin: { right: 1, bottom: 1 }
    });

    container.addChild(box2, {
        constraints: {
            flex: true,
            flexGrow: 2,
            maxWidth: 30
        },
        margin: { right: 1, bottom: 1 }
    });

    container.addChild(box3, {
        constraints: {
            flex: true,
            flexGrow: 1,
            aspectRatio: 3
        },
        margin: { bottom: 1 }
    });

    // Configure layout
    container.setDirection('row');
    container.setJustifyContent('space-between');
    container.setAlignItems('center');
    container.setGap(2);

    layoutDemo.addComponent(container);
    windowManager.addWindow(layoutDemo, { x: 2, y: 1 });

    // Demo 2: Virtualized List with large dataset
    const listDemo = new Window('list-demo', {
        title: 'Virtualized List (10,000 items)',
        width: 50,
        height: 20
    });

    const virtualList = new VirtualizedList('large-list', { x: 1, y: 2 }, { width: 48, height: 16 }, {
        itemHeight: 1,
        overscan: 10,
        enableSelection: true,
        enableMultiSelect: true,
        showNumbers: true
    });

    // Generate large dataset
    const largeDataset = [];
    for (let i = 1; i <= 10000; i++) {
        largeDataset.push({
            id: `item-${i}`,
            data: `Item ${i}: Sample data for virtualized rendering`
        });
    }

    virtualList.setItems(largeDataset);
    listDemo.addComponent(virtualList);
    windowManager.addWindow(listDemo, { x: 55, y: 1 });

    // Demo 3: Virtualized Table
    const tableDemo = new Window('table-demo', {
        title: 'Virtualized Table',
        width: 70,
        height: 20
    });

    const columns = [
        { id: 'id', title: 'ID', width: 8, sortable: true },
        { id: 'name', title: 'Name', width: 20, sortable: true },
        { id: 'value', title: 'Value', width: 15, align: 'right', sortable: true },
        { id: 'status', title: 'Status', width: 12, sortable: false }
    ];

    const virtualTable = new VirtualizedTable('data-table', columns, { x: 1, y: 3 }, { width: 68, height: 15 }, {
        stickyHeader: true,
        enableSelection: true,
        overscan: 5
    });

    // Generate table data
    const tableData = [];
    for (let i = 1; i <= 1000; i++) {
        tableData.push({
            id: `T${i.toString().padStart(4, '0')}`,
            name: `Sample Entry ${i}`,
            value: Math.random() * 1000,
            status: i % 3 === 0 ? 'Active' : i % 3 === 1 ? 'Pending' : 'Inactive'
        });
    }

    virtualTable.setItems(tableData.map(item => ({ id: item.id, data: item })));
    tableDemo.addComponent(virtualTable);
    windowManager.addWindow(tableDemo, { x: 5, y: 22 });

    // Demo 4: Virtualized Log Viewer
    const logDemo = new Window('log-demo', {
        title: 'Virtualized Log Viewer',
        width: 80,
        height: 15
    });

    const virtualLog = new VirtualizedLog('log-viewer', { x: 1, y: 2 }, { width: 78, height: 11 }, {
        showTimestamp: true,
        showLevel: true,
        showSource: true,
        maxMessageLength: 80
    });

    // Generate log entries
    const logEntries = [];
    const levels: Array<'debug' | 'info' | 'warn' | 'error'> = ['debug', 'info', 'warn', 'error'];
    const sources = ['auth', 'database', 'api', 'cache', 'worker'];

    for (let i = 1; i <= 5000; i++) {
        const level = levels[Math.floor(Math.random() * levels.length)];
        const source = sources[Math.floor(Math.random() * sources.length)];

        logEntries.push({
            id: `log-${i}`,
            timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in last day
            level,
            message: `This is a ${level} message from ${source} module with some detailed information that might wrap to multiple lines`,
            source
        });
    }

    virtualLog.addLogEntries(logEntries);
    logDemo.addComponent(virtualLog);
    windowManager.addWindow(logDemo, { x: 2, y: 43 });

    // Demo window management features
    console.log('\n=== Enhanced Window Manager Controls ===');
    console.log('Window Snapping:');
    console.log('  Alt + Arrow Keys: Snap focused window to edges');
    console.log('  Alt + Up: Maximize window');
    console.log('  Alt + Down: Restore window');
    console.log('\nTiling Layouts:');
    console.log('  Alt + 1: 2x2 Grid layout');
    console.log('  Alt + 2: 3x3 Grid layout');
    console.log('  Alt + 3: Master-Pane layout');
    console.log('  Alt + 4: Vertical split');
    console.log('  Alt + 5: Horizontal split');
    console.log('\nGeneral Controls:');
    console.log('  Alt + Tab: Cycle windows');
    console.log('  Alt + F4: Close focused window');
    console.log('  Mouse drag: Move windows (auto-snap to edges)');
    console.log('  Click: Focus window');
    console.log('\nVirtualized Controls:');
    console.log('  Arrow Keys: Navigate');
    console.log('  Page Up/Down: Scroll page');
    console.log('  Home/End: Jump to top/bottom');
    console.log('  Enter/Space: Select item (list/table)');
    console.log('  Click: Focus and select');
    console.log('\nPress ESC to exit...\n');

    // Handle terminal resize
    process.stdout.on('resize', () => {
        const newSize = tui.getTerminalSize();
        windowManager.updateTerminalSize(newSize);
        tui.render();
    });

    // Set up enhanced input handling
    process.stdin.on('data', (data: Buffer) => {
        const input = data.toString();

        // Exit on ESC or Ctrl+C
        if (input === '\u001b' || input === '\u0003') {
            tui.stop();
            process.exit(0);
        }
    });

    // Initial render
    tui.render();
}

// Run the demo
main().catch(console.error);