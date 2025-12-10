import type { Component } from './types';

/**
 * Event types
 */
export enum EventType {
    // System events
    System = 'system',
    Error = 'error',
    Warning = 'warning',

    // Component events
    ComponentCreated = 'component-created',
    ComponentDestroyed = 'component-destroyed',
    ComponentUpdated = 'component-updated',
    ComponentStateChanged = 'component-state-changed',
    ComponentFocused = 'component-focused',
    ComponentBlurred = 'component-blurred',

    // UI events
    Click = 'click',
    DoubleClick = 'double-click',
    Hover = 'hover',
    Select = 'select',
    Change = 'change',
    Submit = 'submit',
    Cancel = 'cancel',

    // Data events
    DataChanged = 'data-changed',
    DataLoaded = 'data-loaded',
    DataSaved = 'data-saved',
    DataError = 'data-error',

    // Navigation events
    Navigate = 'navigate',
    RouteChanged = 'route-changed',

    // Custom events
    Custom = 'custom'
}

/**
 * Event priority levels
 */
export enum EventPriority {
    Critical = 0,
    High = 1,
    Normal = 2,
    Low = 3,
    Background = 4
}

/**
 * Event interface
 */
export interface Event {
    id: string;
    type: EventType | string;
    source?: Component | string;
    target?: Component | string;
    data?: any;
    timestamp: number;
    priority: EventPriority;
    cancelable: boolean;
    canceled: boolean;
    bubbles: boolean;
    propagationStopped: boolean;
    metadata?: Record<string, any>;
}

/**
 * Event listener interface
 */
export interface EventListener {
    id: string;
    component?: Component;
    handler: (event: Event) => void | Promise<void>;
    once: boolean;
    priority: EventPriority;
    conditions?: EventCondition[];
    filter?: EventFilter;
}

/**
 * Event condition for conditional listeners
 */
export interface EventCondition {
    type: 'source' | 'target' | 'data' | 'metadata';
    property: string;
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains' | 'matches';
    value: any;
}

/**
 * Event filter function
 */
export type EventFilter = (event: Event) => boolean;

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
    priority?: EventPriority;
    once?: boolean;
    conditions?: EventCondition[];
    filter?: EventFilter;
    passive?: boolean;
}

/**
 * Event metrics
 */
export interface EventMetrics {
    totalEvents: number;
    eventsByType: Map<string, number>;
    averageProcessingTime: number;
    droppedEvents: number;
    queuedEvents: number;
    listenerCounts: Map<string, number>;
}

/**
 * Shared event bus for inter-component communication
 */
export class EventBus {
    private listeners: Map<string, EventListener[]>;
    private eventQueue: Event[];
    private processing: boolean;
    private maxQueueSize: number;
    private nextEventId: number;
    private nextListenerId: number;
    private history: Event[];
    private maxHistorySize: number;
    private metrics: EventMetrics;
    private middlewares: Array<(event: Event, next: () => void) => void>;

    constructor(maxQueueSize = 10000, maxHistorySize = 1000) {
        this.listeners = new Map();
        this.eventQueue = [];
        this.processing = false;
        this.maxQueueSize = maxQueueSize;
        this.nextEventId = 0;
        this.nextListenerId = 0;
        this.history = [];
        this.maxHistorySize = maxHistorySize;
        this.middlewares = [];

        this.metrics = {
            totalEvents: 0,
            eventsByType: new Map(),
            averageProcessingTime: 0,
            droppedEvents: 0,
            queuedEvents: 0,
            listenerCounts: new Map()
        };
    }

    /**
     * Subscribe to events
     */
    subscribe(
        eventType: EventType | string,
        handler: (event: Event) => void | Promise<void>,
        options: EventSubscriptionOptions = {},
        component?: Component
    ): string {
        const listener: EventListener = {
            id: `listener-${this.nextListenerId++}`,
            component,
            handler,
            once: options.once || false,
            priority: options.priority || EventPriority.Normal,
            conditions: options.conditions,
            filter: options.filter
        };

        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }

        const listeners = this.listeners.get(eventType)!;
        listeners.push(listener);

        // Sort by priority
        listeners.sort((a, b) => a.priority - b.priority);

        // Update metrics
        const count = this.metrics.listenerCounts.get(eventType) || 0;
        this.metrics.listenerCounts.set(eventType, count + 1);

        return listener.id;
    }

    /**
     * Unsubscribe from events
     */
    unsubscribe(eventType: EventType | string, listenerId: string): boolean {
        const listeners = this.listeners.get(eventType);
        if (!listeners) return false;

        const index = listeners.findIndex(l => l.id === listenerId);
        if (index !== -1) {
            listeners.splice(index, 1);

            // Update metrics
            const count = this.metrics.listenerCounts.get(eventType) || 0;
            this.metrics.listenerCounts.set(eventType, Math.max(0, count - 1));

            return true;
        }

        return false;
    }

    /**
     * Unsubscribe all listeners for a component
     */
    unsubscribeAll(component: Component): void {
        for (const [eventType, listeners] of this.listeners) {
            const initialLength = listeners.length;

            for (let i = listeners.length - 1; i >= 0; i--) {
                if (listeners[i].component === component) {
                    listeners.splice(i, 1);
                }
            }

            // Update metrics
            const removed = initialLength - listeners.length;
            const count = this.metrics.listenerCounts.get(eventType) || 0;
            this.metrics.listenerCounts.set(eventType, Math.max(0, count - removed));
        }
    }

    /**
     * Emit an event
     */
    async emit(
        type: EventType | string,
        data?: any,
        source?: Component | string,
        options: {
            target?: Component | string;
            priority?: EventPriority;
            cancelable?: boolean;
            bubbles?: boolean;
            metadata?: Record<string, any>;
        } = {}
    ): Promise<Event> {
        const event: Event = {
            id: `event-${this.nextEventId++}`,
            type,
            source,
            target: options.target,
            data,
            timestamp: Date.now(),
            priority: options.priority || EventPriority.Normal,
            cancelable: options.cancelable || false,
            canceled: false,
            bubbles: options.bubbles || false,
            propagationStopped: false,
            metadata: options.metadata
        };

        // Check queue size
        if (this.eventQueue.length >= this.maxQueueSize) {
            this.metrics.droppedEvents++;
            return event;
        }

        // Add to queue based on priority
        if (event.priority <= EventPriority.High) {
            this.eventQueue.unshift(event);
        } else {
            this.eventQueue.push(event);
        }

        // Update metrics
        this.metrics.totalEvents++;
        this.metrics.queuedEvents = this.eventQueue.length;

        const typeCount = this.metrics.eventsByType.get(type) || 0;
        this.metrics.eventsByType.set(type, typeCount + 1);

        // Process queue if not already processing
        if (!this.processing) {
            await this.processQueue();
        }

        return event;
    }

    /**
     * Emit synchronous event (bypasses queue)
     */
    async emitSync(
        type: EventType | string,
        data?: any,
        source?: Component | string,
        options?: any
    ): Promise<Event> {
        const event: Event = {
            id: `event-${this.nextEventId++}`,
            type,
            source,
            target: options?.target,
            data,
            timestamp: Date.now(),
            priority: options?.priority || EventPriority.Normal,
            cancelable: options?.cancelable || false,
            canceled: false,
            bubbles: options?.bubbles || false,
            propagationStopped: false,
            metadata: options?.metadata
        };

        await this.processEvent(event);
        return event;
    }

    /**
     * Add middleware to event processing pipeline
     */
    use(middleware: (event: Event, next: () => void) => void): void {
        this.middlewares.push(middleware);
    }

    /**
     * Check if there are listeners for an event type
     */
    hasListeners(eventType: EventType | string): boolean {
        const listeners = this.listeners.get(eventType);
        return listeners ? listeners.length > 0 : false;
    }

    /**
     * Get listener count for event type
     */
    getListenerCount(eventType: EventType | string): number {
        const listeners = this.listeners.get(eventType);
        return listeners ? listeners.length : 0;
    }

    /**
     * Get event history
     */
    getHistory(limit?: number): Event[] {
        if (limit) {
            return this.history.slice(-limit);
        }
        return [...this.history];
    }

    /**
     * Clear event history
     */
    clearHistory(): void {
        this.history = [];
    }

    /**
     * Get metrics
     */
    getMetrics(): EventMetrics {
        return {
            ...this.metrics,
            eventsByType: new Map(this.metrics.eventsByType),
            listenerCounts: new Map(this.metrics.listenerCounts)
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            totalEvents: 0,
            eventsByType: new Map(),
            averageProcessingTime: 0,
            droppedEvents: 0,
            queuedEvents: 0,
            listenerCounts: new Map(this.metrics.listenerCounts)
        };
    }

    /**
     * Clear all listeners and events
     */
    clear(): void {
        this.listeners.clear();
        this.eventQueue = [];
        this.history = [];
        this.middlewares = [];
    }

    /**
     * Process event queue
     */
    private async processQueue(): Promise<void> {
        this.processing = true;
        const startTime = performance.now();

        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift()!;
            this.metrics.queuedEvents = this.eventQueue.length;

            try {
                await this.processEvent(event);
            } catch (error) {
                console.error('Event processing error:', error);
                await this.emit(EventType.Error, { error, originalEvent: event });
            }

            // Add to history
            this.history.push(event);
            if (this.history.length > this.maxHistorySize) {
                this.history.shift();
            }
        }

        // Update processing time metric
        const processingTime = performance.now() - startTime;
        this.metrics.averageProcessingTime =
            (this.metrics.averageProcessingTime * (this.metrics.totalEvents - 1) + processingTime) /
            this.metrics.totalEvents;

        this.processing = false;
    }

    /**
     * Process a single event
     */
    private async processEvent(event: Event): Promise<void> {
        // Apply middlewares
        if (this.middlewares.length > 0) {
            await this.applyMiddlewares(event);
            if (event.propagationStopped) return;
        }

        // Get listeners for event type
        const listeners = this.listeners.get(event.type);
        if (!listeners) return;

        // Create array of listeners to notify
        const listenersToNotify: EventListener[] = [];

        for (const listener of listeners) {
            // Check conditions
            if (listener.conditions && !this.checkConditions(event, listener.conditions)) {
                continue;
            }

            // Check filter
            if (listener.filter && !listener.filter(event)) {
                continue;
            }

            // Check target
            if (event.target && listener.component && event.target !== listener.component) {
                continue;
            }

            listenersToNotify.push(listener);
        }

        // Notify listeners
        for (const listener of listenersToNotify) {
            if (event.propagationStopped) break;

            try {
                await listener.handler(event);
            } catch (error) {
                console.error('Event listener error:', error);
            }

            // Remove once listeners
            if (listener.once) {
                this.unsubscribe(event.type, listener.id);
            }
        }

        // Handle bubbling
        if (event.bubbles && !event.propagationStopped && typeof event.source === 'object') {
            // Bubble to parent component if available
            const sourceComponent = event.source as Component;
            if (sourceComponent && sourceComponent.state.data?.parent) {
                event.source = sourceComponent.state.data.parent;
                await this.processEvent(event);
            }
        }
    }

    /**
     * Apply middlewares to event
     */
    private async applyMiddlewares(event: Event): Promise<void> {
        let index = 0;

        const next = () => {
            if (index < this.middlewares.length) {
                const middleware = this.middlewares[index++];
                middleware(event, next);
            }
        };

        next();
    }

    /**
     * Check if event matches conditions
     */
    private checkConditions(event: Event, conditions: EventCondition[]): boolean {
        for (const condition of conditions) {
            let value: any;

            switch (condition.type) {
                case 'source':
                    value = typeof event.source === 'object' ?
                        (event.source as any)[condition.property] : undefined;
                    break;
                case 'target':
                    value = typeof event.target === 'object' ?
                        (event.target as any)[condition.property] : undefined;
                    break;
                case 'data':
                    value = event.data?.[condition.property];
                    break;
                case 'metadata':
                    value = event.metadata?.[condition.property];
                    break;
                default:
                    return false;
            }

            if (!this.compareValues(value, condition.operator, condition.value)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Compare values based on operator
     */
    private compareValues(actual: any, operator: string, expected: any): boolean {
        switch (operator) {
            case 'eq':
                return actual === expected;
            case 'ne':
                return actual !== expected;
            case 'gt':
                return actual > expected;
            case 'lt':
                return actual < expected;
            case 'gte':
                return actual >= expected;
            case 'lte':
                return actual <= expected;
            case 'in':
                return Array.isArray(expected) && expected.includes(actual);
            case 'contains':
                return typeof actual === 'string' && actual.includes(expected);
            case 'matches':
                return typeof actual === 'string' &&
                    new RegExp(expected).test(actual);
            default:
                return false;
        }
    }
}