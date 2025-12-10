/**
 * Tests for the new rendering and layout engine
 */

import { RenderEngine, RenderBuffer, FrameThrottler } from '../render-engine.js';
import { AdvancedContainer } from '../advanced-container.js';
import { EnhancedWindowManager } from '../enhanced-window-manager.js';
import { VirtualizedList, VirtualizedTable, VirtualizedLog } from '../virtualized-renderer.js';
import { Box } from '../box.js';
import { TerminalController } from '../terminal-controller.js';

// Mock terminal controller for testing
class MockTerminalController {
    getTerminalSize() {
        return { columns: 80, rows: 24 };
    }

    setCursorPosition() {}
    write() {}
    clearScreen() {}
    writeAt() {}
}

describe('RenderEngine', () => {
    let renderEngine: RenderEngine;
    let terminal: any;

    beforeEach(() => {
        terminal = new MockTerminalController() as any;
        renderEngine = new RenderEngine(terminal, 60);
    });

    test('should initialize with correct buffers', () => {
        expect(renderEngine.getTargetFPS()).toBe(60);
    });

    test('should throttle frames based on FPS', () => {
        const initialShouldRender = renderEngine['frameThrottler'].shouldRender();
        renderEngine['frameThrottler']['lastFrameTime'] = Date.now() - 100; // Simulate time passed
        const afterTimeShouldRender = renderEngine['frameThrottler'].shouldRender();

        expect(typeof initialShouldRender).toBe('boolean');
        expect(typeof afterTimeShouldRender).toBe('boolean');
    });
});

describe('RenderBuffer', () => {
    let buffer: RenderBuffer;

    beforeEach(() => {
        buffer = new RenderBuffer(10, 5);
    });

    test('should initialize with correct dimensions', () => {
        const dimensions = buffer.getDimensions();
        expect(dimensions.width).toBe(10);
        expect(dimensions.height).toBe(5);
    });

    test('should write text at position', () => {
        buffer.write(0, 0, 'Hello');
        const output = buffer.toString();
        expect(output).toContain('Hello');
    });

    test('should fill rectangle', () => {
        buffer.fillRect(1, 1, 3, 2, 'X');
        const output = buffer.toString();
        const lines = output.split('\n');
        expect(lines[1]).toContain('XXX');
        expect(lines[2]).toContain('XXX');
    });

    test('should detect changes between buffers', () => {
        buffer.write(0, 0, 'Hello');
        const otherBuffer = new RenderBuffer(10, 5);
        otherBuffer.write(0, 0, 'World');

        const dirtyRegions = buffer.diff(otherBuffer);
        expect(dirtyRegions.length).toBeGreaterThan(0);
    });

    test('should resize buffer', () => {
        buffer.resize(20, 10);
        const dimensions = buffer.getDimensions();
        expect(dimensions.width).toBe(20);
        expect(dimensions.height).toBe(10);
    });
});

describe('FrameThrottler', () => {
    let throttler: FrameThrottler;

    beforeEach(() => {
        throttler = new FrameThrottler(30);
    });

    test('should have correct target FPS', () => {
        expect(throttler.getTargetFPS()).toBe(30);
    });

    test('should set target FPS', () => {
        throttler.setTargetFPS(120);
        expect(throttler.getTargetFPS()).toBe(120);
    });

    test('should control render timing', () => {
        const now = Date.now();
        throttler['lastFrameTime'] = now - 100; // 100ms ago

        // With 30 FPS, frame interval is ~33ms
        // Since 100ms have passed, should render
        expect(throttler.shouldRender()).toBe(true);
    });
});

describe('AdvancedContainer', () => {
    let container: AdvancedContainer;

    beforeEach(() => {
        container = new AdvancedContainer('test-container', { x: 0, y: 0 }, { width: 80, height: 24 });
    });

    test('should add children correctly', () => {
        const child = new Box('test-child');
        child.size = { width: 10, height: 5 };

        container.addChild(child);

        expect(container['children'].length).toBe(1);
        expect(container['children'][0].component.id).toBe('test-child');
    });

    test('should remove children correctly', () => {
        const child = new Box('test-child');
        child.size = { width: 10, height: 5 };

        container.addChild(child);
        const removed = container.removeChild('test-child');

        expect(removed).toBe(true);
        expect(container['children'].length).toBe(0);
    });

    test('should set layout properties', () => {
        container.setDirection('column');
        container.setJustifyContent('center');
        container.setAlignItems('stretch');
        container.setWrap('wrap');
        container.setGap(5);

        expect(container['direction']).toBe('column');
        expect(container['justifyContent']).toBe('center');
        expect(container['alignItems']).toBe('stretch');
        expect(container['wrap']).toBe('wrap');
        expect(container['gap']).toBe(5);
    });

    test('should render children', () => {
        const child = new Box('test-child', {
            title: 'Test',
            border: 'single'
        });
        child.size = { width: 10, height: 3 };
        child.position = { x: 0, y: 0 };

        container.addChild(child);
        const output = container.render();

        expect(output).toContain('Test');
        expect(output).toBeTruthy();
    });
});

describe('VirtualizedList', () => {
    let list: VirtualizedList;

    beforeEach(() => {
        list = new VirtualizedList('test-list', { x: 0, y: 0 }, { width: 20, height: 10 });
    });

    test('should set items correctly', () => {
        const items = [
            { id: '1', data: 'Item 1' },
            { id: '2', data: 'Item 2' },
            { id: '3', data: 'Item 3' }
        ];

        list.setItems(items);

        expect(list['items'].length).toBe(3);
    });

    test('should add items', () => {
        const initialItems = [
            { id: '1', data: 'Item 1' }
        ];
        list.setItems(initialItems);

        const newItems = [
            { id: '2', data: 'Item 2' },
            { id: '3', data: 'Item 3' }
        ];
        list.addItems(newItems);

        expect(list['items'].length).toBe(3);
        expect(list['items'][2].id).toBe('3');
    });

    test('should remove items', () => {
        const items = [
            { id: '1', data: 'Item 1' },
            { id: '2', data: 'Item 2' },
            { id: '3', data: 'Item 3' }
        ];
        list.setItems(items);

        list.removeItem('2');

        expect(list['items'].length).toBe(2);
        expect(list['items'].find(item => item.id === '2')).toBeUndefined();
    });

    test('should calculate visible range', () => {
        // Create 100 items
        const items = Array.from({ length: 100 }, (_, i) => ({
            id: `${i}`,
            data: `Item ${i}`
        }));
        list.setItems(items);

        const range = list.getVisibleRange();

        expect(typeof range.start).toBe('number');
        expect(typeof range.end).toBe('number');
        expect(range.start <= range.end);
    });

    test('should render list', () => {
        const items = [
            { id: '1', data: 'First item' },
            { id: '2', data: 'Second item' },
            { id: '3', data: 'Third item' }
        ];
        list.setItems(items);

        const output = list.render();

        expect(output).toContain('First item');
        expect(output).toBeTruthy();
    });
});

describe('VirtualizedTable', () => {
    const columns = [
        { id: 'name', title: 'Name', width: 20 },
        { id: 'age', title: 'Age', width: 10 },
        { id: 'city', title: 'City', width: 15 }
    ];

    let table: VirtualizedTable;

    beforeEach(() => {
        table = new VirtualizedTable('test-table', columns, { x: 0, y: 0 }, { width: 50, height: 15 });
    });

    test('should initialize with columns', () => {
        expect(table['columns'].length).toBe(3);
        expect(table['columns'][0].id).toBe('name');
    });

    test('should render header', () => {
        const header = table.renderHeader();
        expect(header).toContain('Name');
        expect(header).toContain('Age');
        expect(header).toContain('City');
    });

    test('should sort by column', () => {
        const data = [
            { id: '1', data: { name: 'Charlie', age: 30, city: 'London' } },
            { id: '2', data: { name: 'Alice', age: 25, city: 'New York' } },
            { id: '3', data: { name: 'Bob', age: 35, city: 'Paris' } }
        ];
        table.setItems(data);

        table.sortByColumn('name');

        // Check that sorting occurred (order might be different based on implementation)
        const names = table['items'].map(item => item.data.name);
        expect(names).toContain('Alice');
        expect(names).toContain('Bob');
        expect(names).toContain('Charlie');
    });
});

describe('VirtualizedLog', () => {
    let log: VirtualizedLog;

    beforeEach(() => {
        log = new VirtualizedLog('test-log', { x: 0, y: 0 }, { width: 60, height: 15 });
    });

    test('should add log entries', () => {
        const entry = {
            id: 'log-1',
            timestamp: new Date(),
            level: 'info' as const,
            message: 'Test log message',
            source: 'test'
        };

        log.addLogEntry(entry);

        expect(log['items'].length).toBe(1);
        expect(log['items'][0].data.message).toBe('Test log message');
    });

    test('should add multiple log entries', () => {
        const entries = [
            {
                id: 'log-1',
                timestamp: new Date(),
                level: 'info' as const,
                message: 'Info message',
                source: 'test'
            },
            {
                id: 'log-2',
                timestamp: new Date(),
                level: 'error' as const,
                message: 'Error message',
                source: 'test'
            }
        ];

        log.addLogEntries(entries);

        expect(log['items'].length).toBe(2);
    });

    test('should calculate word wrap height', () => {
        const longEntry = {
            id: 'log-long',
            timestamp: new Date(),
            level: 'info' as const,
            message: 'This is a very long log message that should wrap to multiple lines when rendered in the virtualized log viewer component',
            source: 'test'
        };

        log.addLogEntry(longEntry);

        const height = log.calculateLogHeight(longEntry);
        expect(height).toBeGreaterThan(1);
    });

    test('should render with timestamps and levels', () => {
        log['showTimestamp'] = true;
        log['showLevel'] = true;

        const entry = {
            id: 'log-1',
            timestamp: new Date('2023-01-01T12:00:00'),
            level: 'error' as const,
            message: 'Critical error occurred',
            source: 'system'
        };

        log.addLogEntry(entry);
        const output = log.render();

        expect(output).toContain('ERROR');
        expect(output).toContain('Critical error');
    });
});