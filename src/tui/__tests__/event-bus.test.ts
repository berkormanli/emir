import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus, EventType, EventPriority } from '../event-bus';
import type { Component } from '../types';

describe('EventBus', () => {
    let eventBus: EventBus;
    let mockComponent: Component;

    beforeEach(() => {
        eventBus = new EventBus(1000, 100);

        mockComponent = {
            id: 'test-component',
            position: { x: 0, y: 0 },
            size: { width: 10, height: 3 },
            visible: true,
            state: {
                focused: false,
                dirty: false,
                data: {},
                validation: { valid: true, errors: [], warnings: [] }
            },
            render: () => '',
            handleInput: () => false,
            focus: () => {},
            blur: () => {},
            update: () => {},
            destroy: () => {}
        };
    });

    describe('Subscription Management', () => {
        it('should subscribe to events', () => {
            let eventReceived = false;
            const id = eventBus.subscribe('test-event', () => {
                eventReceived = true;
            });

            expect(typeof id).toBe('string');
            expect(eventBus.hasListeners('test-event')).toBe(true);
        });

        it('should unsubscribe from events', () => {
            const id = eventBus.subscribe('test-event', () => {});
            const unsubscribed = eventBus.unsubscribe('test-event', id);

            expect(unsubscribed).toBe(true);
            expect(eventBus.hasListeners('test-event')).toBe(false);
        });

        it('should unsubscribe all for component', () => {
            eventBus.subscribe('event1', () => {}, {}, mockComponent);
            eventBus.subscribe('event2', () => {}, {}, mockComponent);
            eventBus.subscribe('event3', () => {}, {});

            eventBus.unsubscribeAll(mockComponent);

            expect(eventBus.getListenerCount('event1')).toBe(0);
            expect(eventBus.getListenerCount('event2')).toBe(0);
            expect(eventBus.getListenerCount('event3')).toBe(1);
        });

        it('should support multiple subscriptions', () => {
            eventBus.subscribe('test-event', () => {});
            eventBus.subscribe('test-event', () => {});
            eventBus.subscribe('test-event', () => {});

            expect(eventBus.getListenerCount('test-event')).toBe(3);
        });
    });

    describe('Event Emission', () => {
        it('should emit and receive events', async () => {
            let receivedData: any;
            eventBus.subscribe('test-event', (event) => {
                receivedData = event.data;
            });

            const testData = { value: 123 };
            await eventBus.emit('test-event', testData);

            expect(receivedData).toEqual(testData);
        });

        it('should emit synchronous events', async () => {
            let received = false;
            eventBus.subscribe('sync-test', () => {
                received = true;
            });

            await eventBus.emitSync('sync-test', null);
            expect(received).toBe(true);
        });

        it('should handle event priority', async () => {
            const order: number[] = [];
            eventBus.subscribe('priority-test', () => {
                order.push(1);
            }, { priority: EventPriority.Low });
            eventBus.subscribe('priority-test', () => {
                order.push(0);
            }, { priority: EventPriority.High });

            await eventBus.emit('priority-test');
            expect(order).toEqual([0, 1]);
        });

        it('should execute once listeners', async () => {
            let count = 0;
            eventBus.subscribe('once-test', () => {
                count++;
            }, { once: true });

            await eventBus.emit('once-test');
            await eventBus.emit('once-test');

            expect(count).toBe(1);
        });

        it('should support event bubbling', async () => {
            let receivedByParent = false;
            let receivedByChild = false;

            const parent = {
                ...mockComponent,
                id: 'parent',
                state: {
                    ...mockComponent.state,
                    data: { parent: null }
                }
            };

            const child = {
                ...mockComponent,
                id: 'child',
                state: {
                    ...mockComponent.state,
                    data: { parent }
                }
            };

            eventBus.subscribe('bubble-test', () => {
                receivedByChild = true;
            });

            eventBus.subscribe('bubble-test', () => {
                receivedByParent = true;
            });

            await eventBus.emit('bubble-test', null, child, { bubbles: true });

            expect(receivedByChild).toBe(true);
            // Note: Full bubbling implementation would need component hierarchy
        });
    });

    describe('Event Filtering', () => {
        it('should filter events by condition', async () => {
            let received = false;
            eventBus.subscribe('filter-test', () => {
                received = true;
            }, {
                conditions: [
                    {
                        type: 'data',
                        property: 'type',
                        operator: 'eq',
                        value: 'allowed'
                    }
                ]
            });

            await eventBus.emit('filter-test', { type: 'blocked' });
            expect(received).toBe(false);

            await eventBus.emit('filter-test', { type: 'allowed' });
            expect(received).toBe(true);
        });

        it('should filter events by function', async () => {
            let received = false;
            eventBus.subscribe('filter-fn-test', () => {
                received = true;
            }, {
                filter: (event) => event.data.value > 10
            });

            await eventBus.emit('filter-fn-test', { value: 5 });
            expect(received).toBe(false);

            await eventBus.emit('filter-fn-test', { value: 15 });
            expect(received).toBe(true);
        });

        it('should filter by target component', async () => {
            let received = false;
            const otherComponent = { ...mockComponent, id: 'other' };

            eventBus.subscribe('target-test', () => {
                received = true;
            }, { component: mockComponent });

            await eventBus.emit('target-test', null, undefined, { target: otherComponent });
            expect(received).toBe(false);

            await eventBus.emit('target-test', null, undefined, { target: mockComponent });
            expect(received).toBe(true);
        });
    });

    describe('Event Conditions', () => {
        it('should evaluate equality conditions', () => {
            const testEvent = {
                data: { type: 'test', value: 42 },
                metadata: { category: 'important' }
            };

            // Test data equality
            const condition1 = {
                type: 'data' as const,
                property: 'type',
                operator: 'eq' as const,
                value: 'test'
            };
            expect(eventBus['compareValues'](testEvent.data.type, condition1.operator, condition1.value)).toBe(true);

            // Test data inequality
            const condition2 = {
                type: 'data' as const,
                property: 'type',
                operator: 'ne' as const,
                value: 'other'
            };
            expect(eventBus['compareValues'](testEvent.data.type, condition2.operator, condition2.value)).toBe(true);
        });

        it('should evaluate range conditions', () => {
            expect(eventBus['compareValues'](15, 'gt', 10)).toBe(true);
            expect(eventBus['compareValues'](15, 'lt', 20)).toBe(true);
            expect(eventBus['compareValues'](15, 'gte', 15)).toBe(true);
            expect(eventBus['compareValues'](15, 'lte', 15)).toBe(true);
        });

        it('should evaluate array conditions', () => {
            expect(eventBus['compareValues']('apple', 'in', ['apple', 'banana'])).toBe(true);
            expect(eventBus['compareValues']('cherry', 'in', ['apple', 'banana'])).toBe(false);
        });

        it('should evaluate string conditions', () => {
            expect(eventBus['compareValues']('hello world', 'contains', 'world')).toBe(true);
            expect(eventBus['compareValues']('test@example.com', 'matches', '^[^@]+@[^@]+\.[^@]+$')).toBe(true);
        });
    });

    describe('Event History', () => {
        it('should maintain event history', async () => {
            await eventBus.emit('event1', { data: 1 });
            await eventBus.emit('event2', { data: 2 });
            await eventBus.emit('event3', { data: 3 });

            const history = eventBus.getHistory();
            expect(history).toHaveLength(3);
            expect(history[0].data.data).toBe(1);
            expect(history[1].data.data).toBe(2);
            expect(history[2].data.data).toBe(3);
        });

        it('should limit history size', async () => {
            const limitedBus = new EventBus(1000, 2);
            await limitedBus.emit('event1', {});
            await limitedBus.emit('event2', {});
            await limitedBus.emit('event3', {});

            const history = limitedBus.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0].type).toBe('event2');
            expect(history[1].type).toBe('event3');
        });

        it('should clear history', async () => {
            await eventBus.emit('event1', {});
            await eventBus.emit('event2', {});

            eventBus.clearHistory();
            const history = eventBus.getHistory();
            expect(history).toHaveLength(0);
        });
    });

    describe('Middleware', () => {
        it('should apply middleware', async () => {
            const order: string[] = [];
            let middlewareCalled = false;

            eventBus.use((event, next) => {
                order.push('middleware');
                middlewareCalled = true;
                next();
            });

            eventBus.subscribe('middleware-test', () => {
                order.push('listener');
            });

            await eventBus.emit('middleware-test');

            expect(middlewareCalled).toBe(true);
            expect(order).toEqual(['middleware', 'listener']);
        });

        it('should support multiple middleware', async () => {
            const order: string[] = [];

            eventBus.use((event, next) => {
                order.push('1');
                next();
            });
            eventBus.use((event, next) => {
                order.push('2');
                next();
            });
            eventBus.use((event, next) => {
                order.push('3');
                next();
            });

            await eventBus.emit('multi-middleware');
            expect(order).toEqual(['1', '2', '3']);
        });

        it('should stop propagation when canceled', async () => {
            let listenerCalled = false;
            eventBus.subscribe('cancel-test', () => {
                listenerCalled = true;
            });

            const testEvent = {
                type: 'cancel-test',
                cancelable: true,
                canceled: false
            };

            testEvent.canceled = true;
            await eventBus['processEvent'](testEvent);

            expect(listenerCalled).toBe(false);
        });
    });

    describe('Metrics', () => {
        it('should track metrics', async () => {
            await eventBus.emit('test1', {});
            await eventBus.emit('test2', {});
            await eventBus.emit('test1', {});

            const metrics = eventBus.getMetrics();
            expect(metrics.totalEvents).toBe(3);
            expect(metrics.eventsByType.get('test1')).toBe(2);
            expect(metrics.eventsByType.get('test2')).toBe(1);
        });

        it('should reset metrics', async () => {
            await eventBus.emit('test', {});
            eventBus.resetMetrics();

            const metrics = eventBus.getMetrics();
            expect(metrics.totalEvents).toBe(0);
            expect(metrics.eventsByType.size).toBe(0);
        });

        it('should track dropped events when queue full', async () => {
            const fullBus = new EventBus(1, 100);

            // Emit more than queue size
            await fullBus.emit('event1', {});
            await fullBus.emit('event2', {});

            const metrics = fullBus.getMetrics();
            expect(metrics.droppedEvents).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle listener errors', async () => {
            let errorLogged = false;
            const originalError = console.error;
            console.error = () => { errorLogged = true; };

            eventBus.subscribe('error-test', () => {
                throw new Error('Test error');
            });

            await eventBus.emit('error-test');

            console.error = originalError;
            expect(errorLogged).toBe(true);
        });

        it('should continue processing after errors', async () => {
            let secondListenerCalled = false;

            eventBus.subscribe('error-recovery-test', () => {
                throw new Error('First error');
            });
            eventBus.subscribe('error-recovery-test', () => {
                secondListenerCalled = true;
            });

            const originalError = console.error;
            console.error = () => {};

            await eventBus.emit('error-recovery-test');

            console.error = originalError;
            expect(secondListenerCalled).toBe(true);
        });
    });
});