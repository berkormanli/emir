import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RuntimeCore } from '../runtime-core';
import { Box, type Component } from '../index';

describe('RuntimeCore', () => {
    let runtime: RuntimeCore;
    let mockComponent: Component;

    beforeEach(() => {
        runtime = new RuntimeCore({
            enableDiagnostics: true,
            enableMetrics: true,
            enableLogging: false
        });

        // Create mock component
        mockComponent = new Box('test-component', {
            title: 'Test Component',
            content: 'Test Content',
            border: 'single',
            position: { x: 0, y: 0 },
            size: { width: 20, height: 5 }
        });

        mockComponent.handleInput = () => false;
    });

    afterEach(async () => {
        if (runtime.active) {
            await runtime.stop();
        }
    });

    describe('Initialization', () => {
        it('should initialize all subsystems', async () => {
            await runtime.initialize();

            expect(runtime.initialized).toBe(true);
            expect(runtime.inputManager).toBeDefined();
            expect(runtime.focusManager).toBeDefined();
            expect(runtime.scheduler).toBeDefined();
            expect(runtime.eventBus).toBeDefined();
            expect(runtime.stateStore).toBeDefined();
            expect(runtime.diagnostics).toBeDefined();
        });

        it('should start and stop correctly', async () => {
            await runtime.initialize();
            await runtime.start();

            expect(runtime.active).toBe(true);

            await runtime.stop();
            expect(runtime.active).toBe(false);
        });

        it('should emit system events on start/stop', async () => {
            await runtime.initialize();

            const events: any[] = [];
            runtime.eventBus.subscribe('system', (event) => {
                events.push(event);
            });

            await runtime.start();
            await runtime.stop();

            expect(events).toHaveLength(2);
            expect(events[0].data.type).toBe('runtime-started');
            expect(events[1].data.type).toBe('runtime-stopped');
        });
    });

    describe('Component Management', () => {
        beforeEach(async () => {
            await runtime.initialize();
        });

        it('should register components', () => {
            runtime.registerComponent(mockComponent);

            expect(runtime.getComponent('test-component')).toBe(mockComponent);
            expect(runtime.getAllComponents()).toContain(mockComponent);
        });

        it('should unregister components', () => {
            runtime.registerComponent(mockComponent);
            runtime.unregisterComponent('test-component');

            expect(runtime.getComponent('test-component')).toBeUndefined();
            expect(runtime.getAllComponents()).not.toContain(mockComponent);
        });

        it('should emit component events', async () => {
            const events: any[] = [];
            runtime.eventBus.subscribe('component-created', (event) => {
                events.push(event);
            });
            runtime.eventBus.subscribe('component-destroyed', (event) => {
                events.push(event);
            });

            runtime.registerComponent(mockComponent);
            runtime.unregisterComponent('test-component');

            expect(events).toHaveLength(2);
            expect(events[0].data.component).toBe(mockComponent);
            expect(events[1].data.component).toBe(mockComponent);
        });
    });

    describe('Input Handling', () => {
        beforeEach(async () => {
            await runtime.initialize();
            await runtime.start();
        });

        it('should handle input events', async () => {
            const inputEvent = {
                type: 'key' as const,
                key: 'enter',
                ctrl: false,
                alt: false,
                shift: false
            };

            const handled = await runtime.handleInput(inputEvent);
            expect(typeof handled).toBe('boolean');
        });

        it('should route input to focused component', async () => {
            runtime.registerComponent(mockComponent);
            runtime.focusManager.focusComponent(mockComponent);

            let inputReceived = false;
            mockComponent.handleInput = () => {
                inputReceived = true;
                return true;
            };

            const inputEvent = {
                type: 'key' as const,
                key: 'a',
                ctrl: false,
                alt: false,
                shift: false
            };

            await runtime.handleInput(inputEvent);
            expect(inputReceived).toBe(true);
        });
    });

    describe('State Management', () => {
        beforeEach(async () => {
            await runtime.initialize();
        });

        it('should update state reactively', async () => {
            const states: any[] = [];
            runtime.stateStore.subscribe(['test'], (state) => {
                states.push(state);
            });

            await runtime.stateStore.set(['test'], 'value1');
            await runtime.stateStore.set(['test'], 'value2');

            expect(states).toHaveLength(2);
            expect(states[0]).toBe('value1');
            expect(states[1]).toBe('value2');
        });

        it('should batch updates', async () => {
            const updates: any[] = [];
            runtime.stateStore.subscribe(['batch'], (state) => {
                updates.push(state);
            });

            await runtime.stateStore.batch(async () => {
                await runtime.stateStore.set(['batch', 'a'], 1);
                await runtime.stateStore.set(['batch', 'b'], 2);
                await runtime.stateStore.set(['batch', 'c'], 3);
            });

            expect(updates).toHaveLength(1);
            expect(updates[0]).toEqual({ a: 1, b: 2, c: 3 });
        });
    });

    describe('Event System', () => {
        beforeEach(async () => {
            await runtime.initialize();
        });

        it('should emit and receive events', async () => {
            let eventReceived = false;
            runtime.eventBus.subscribe('test-event', () => {
                eventReceived = true;
            });

            await runtime.eventBus.emit('test-event', { data: 'test' });
            expect(eventReceived).toBe(true);
        });

        it('should handle event priorities', async () => {
            const order: number[] = [];
            runtime.eventBus.subscribe('priority-test', () => {
                order.push(1);
            }, { priority: 1 });
            runtime.eventBus.subscribe('priority-test', () => {
                order.push(0);
            }, { priority: 0 });

            await runtime.eventBus.emit('priority-test');
            expect(order).toEqual([0, 1]);
        });
    });

    describe('Scheduler', () => {
        beforeEach(async () => {
            await runtime.initialize();
            await runtime.start();
        });

        it('should schedule tasks', async () => {
            let taskExecuted = false;
            runtime.scheduler.scheduleTask(() => {
                taskExecuted = true;
            });

            await new Promise(resolve => setTimeout(resolve, 50));
            expect(taskExecuted).toBe(true);
        });

        it('should schedule delayed tasks', async () => {
            let taskExecuted = false;
            const startTime = Date.now();

            runtime.scheduler.scheduleTask(() => {
                taskExecuted = true;
            }, undefined, 100);

            await new Promise(resolve => setTimeout(resolve, 150));
            expect(taskExecuted).toBe(true);
            expect(Date.now() - startTime).toBeGreaterThanOrEqual(95);
        });

        it('should track performance metrics', () => {
            const metrics = runtime.scheduler.getMetrics();
            expect(metrics).toHaveProperty('fps');
            expect(metrics).toHaveProperty('frameTime');
            expect(metrics).toHaveProperty('totalFrames');
        });
    });

    describe('Focus Management', () => {
        beforeEach(async () => {
            await runtime.initialize();
        });

        it('should manage focus between components', () => {
            const comp1 = new Box('comp1', {
                border: 'single',
                position: { x: 0, y: 0 },
                size: { width: 10, height: 3 }
            });
            comp1.handleInput = () => false;

            const comp2 = new Box('comp2', {
                border: 'single',
                position: { x: 0, y: 4 },
                size: { width: 10, height: 3 }
            });
            comp2.handleInput = () => false;

            runtime.registerComponent(comp1);
            runtime.registerComponent(comp2);

            runtime.focusManager.focusComponent(comp1);
            expect(runtime.focusManager.getFocusedComponent()).toBe(comp1);

            runtime.focusManager.focusNext();
            expect(runtime.focusManager.getFocusedComponent()).toBe(comp2);
        });

        it('should emit focus events', async () => {
            const events: string[] = [];
            runtime.focusManager.addFocusEventListener('focus', () => {
                events.push('focus');
            });
            runtime.focusManager.addFocusEventListener('blur', () => {
                events.push('blur');
            });

            runtime.registerComponent(mockComponent);
            runtime.focusManager.focusComponent(mockComponent);
            runtime.focusManager.blurComponent(mockComponent);

            expect(events).toEqual(['focus', 'blur']);
        });
    });

    describe('Diagnostics', () => {
        beforeEach(async () => {
            await runtime.initialize();
        });

        it('should log diagnostic messages', () => {
            runtime.diagnostics.info(
                'performance',
                'Test info message'
            );

            runtime.diagnostics.warning(
                'memory',
                'Test warning'
            );

            runtime.diagnostics.error(
                'system',
                'Test error',
                undefined,
                new Error('Test')
            );

            const diagnostics = runtime.diagnostics.getDiagnostics();
            expect(diagnostics.length).toBe(3);
            expect(diagnostics[0].severity).toBe('info');
            expect(diagnostics[1].severity).toBe('warning');
            expect(diagnostics[2].severity).toBe('error');
        });

        it('should track performance metrics', () => {
            runtime.diagnostics.updatePerformanceMetrics({
                fps: 60,
                frameTime: 16.67,
                memoryUsage: 50 * 1024 * 1024
            });

            const metrics = runtime.diagnostics.getPerformanceMetrics();
            expect(metrics.fps).toBe(60);
            expect(metrics.memoryUsage).toBe(50 * 1024 * 1024);
        });

        it('should create memory snapshots', () => {
            runtime.diagnostics.createMemorySnapshot(10, 100);
            const snapshots = runtime.diagnostics.getMemorySnapshots();
            expect(snapshots).toHaveLength(1);
            expect(snapshots[0].componentCount).toBe(10);
            expect(snapshots[0].eventCount).toBe(100);
        });

        it('should generate reports', () => {
            const report = runtime.diagnostics.generateReport();
            expect(report).toContain('Runtime Diagnostics Report');
            expect(report).toContain('Summary:');
        });
    });

    describe('Integration', () => {
        it('should handle all subsystems together', async () => {
            await runtime.initialize();
            await runtime.start();

            // Register component
            runtime.registerComponent(mockComponent);

            // Update state
            await runtime.stateStore.set(['test'], 'value');

            // Emit event
            await runtime.eventBus.emit('integration-test', { data: 'test' });

            // Schedule task
            let taskRan = false;
            runtime.scheduler.scheduleTask(() => {
                taskRan = true;
            });

            // Focus component
            runtime.focusManager.focusComponent(mockComponent);

            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(taskRan).toBe(true);
            expect(runtime.focusManager.getFocusedComponent()).toBe(mockComponent);
            expect(runtime.stateStore.getState(['test'])).toBe('value');
        });

        it('should generate comprehensive report', () => {
            const report = runtime.generateReport();
            expect(report).toContain('Runtime Diagnostics Report');
            expect(report).toContain('Components');
            expect(report).toContain('State Store');
            expect(report).toContain('Scheduler');
        });
    });
});