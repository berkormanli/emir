import type { Component } from './types';
import { EventBus, EventType } from './event-bus';

/**
 * State mutation types
 */
export enum MutationType {
    Set = 'set',
    Update = 'update',
    Delete = 'delete',
    Merge = 'merge',
    Push = 'push',
    Pop = 'pop',
    Shift = 'shift',
    Unshift = 'unshift',
    Splice = 'splice'
}

/**
 * State mutation interface
 */
export interface Mutation {
    id: string;
    type: MutationType;
    path: string[];
    payload: any;
    timestamp: number;
    source?: Component | string;
    metadata?: Record<string, any>;
}

/**
 * State subscription interface
 */
export interface StateSubscription {
    id: string;
    component?: Component;
    paths: string[];
    handler: (state: any, mutation?: Mutation) => void;
    immediate?: boolean;
    deep?: boolean;
}

/**
 * State selector function
 */
export type StateSelector<T> = (state: any) => T;

/**
 * State validator function
 */
export type StateValidator = (state: any, mutation: Mutation) => boolean | string;

/**
 * State middleware function
 */
export type StateMiddleware = (
    state: any,
    mutation: Mutation,
    next: () => void
) => void;

/**
 * State snapshot for time travel
 */
export interface StateSnapshot {
    id: string;
    state: any;
    timestamp: number;
    mutation?: Mutation;
    description?: string;
}

/**
 * Store configuration
 */
export interface StoreConfig {
    immutable?: boolean;
    enableHistory?: boolean;
    maxHistorySize?: number;
    enableTimeTravel?: boolean;
    enableDevTools?: boolean;
    initialState?: any;
}

/**
 * Centralized reactive state store
 */
export class StateStore {
    private state: any;
    private subscriptions: Map<string, StateSubscription[]>;
    private mutations: Mutation[];
    private history: StateSnapshot[];
    private currentIndex: number;
    private middlewares: StateMiddleware[];
    private validators: Map<string, StateValidator[]>;
    private eventBus: EventBus;
    private config: Required<StoreConfig>;
    private nextSubscriptionId: number;
    private nextMutationId: number;
    private pendingMutations: Mutation[];
    private batchUpdates: boolean;

    constructor(eventBus: EventBus, config: StoreConfig = {}) {
        this.eventBus = eventBus;
        this.config = {
            immutable: true,
            enableHistory: true,
            maxHistorySize: 100,
            enableTimeTravel: true,
            enableDevTools: false,
            initialState: {},
            ...config
        };

        this.state = this.config.immutable ?
            this.deepClone(this.config.initialState) :
            this.config.initialState;

        this.subscriptions = new Map();
        this.mutations = [];
        this.history = [];
        this.currentIndex = -1;
        this.middlewares = [];
        this.validators = new Map();
        this.nextSubscriptionId = 0;
        this.nextMutationId = 0;
        this.pendingMutations = [];
        this.batchUpdates = false;

        // Create initial snapshot
        if (this.config.enableHistory) {
            this.createSnapshot('Initial state');
        }
    }

    /**
     * Get state at specified path
     */
    getState<T = any>(path?: string[]): T {
        if (!path || path.length === 0) {
            return this.state;
        }

        return this.getNestedValue(this.state, path);
    }

    /**
     * Select state with selector function
     */
    select<T>(selector: StateSelector<T>): T {
        return selector(this.state);
    }

    /**
     * Subscribe to state changes
     */
    subscribe(
        paths: string | string[],
        handler: (state: any, mutation?: Mutation) => void,
        options: {
            component?: Component;
            immediate?: boolean;
            deep?: boolean;
        } = {}
    ): string {
        const pathArray = Array.isArray(paths) ? paths : [paths];
        const subscription: StateSubscription = {
            id: `sub-${this.nextSubscriptionId++}`,
            component: options.component,
            paths: pathArray,
            handler,
            immediate: options.immediate || false,
            deep: options.deep || false
        };

        // Store subscription
        for (const path of pathArray) {
            if (!this.subscriptions.has(path)) {
                this.subscriptions.set(path, []);
            }
            this.subscriptions.get(path)!.push(subscription);
        }

        // Immediate call if requested
        if (subscription.immediate) {
            const state = this.getState(pathArray[0]);
            handler(state);
        }

        return subscription.id;
    }

    /**
     * Unsubscribe from state changes
     */
    unsubscribe(subscriptionId: string): boolean {
        let removed = false;

        for (const [path, subscriptions] of this.subscriptions) {
            const index = subscriptions.findIndex(s => s.id === subscriptionId);
            if (index !== -1) {
                subscriptions.splice(index, 1);
                removed = true;

                if (subscriptions.length === 0) {
                    this.subscriptions.delete(path);
                }
            }
        }

        return removed;
    }

    /**
     * Unsubscribe all for a component
     */
    unsubscribeAll(component: Component): void {
        for (const [path, subscriptions] of this.subscriptions) {
            const initialLength = subscriptions.length;

            for (let i = subscriptions.length - 1; i >= 0; i--) {
                if (subscriptions[i].component === component) {
                    subscriptions.splice(i, 1);
                }
            }

            if (subscriptions.length === 0) {
                this.subscriptions.delete(path);
            }
        }
    }

    /**
     * Dispatch a mutation to change state
     */
    async dispatch(
        type: MutationType,
        path: string[],
        payload: any,
        source?: Component | string,
        metadata?: Record<string, any>
    ): Promise<void> {
        const mutation: Mutation = {
            id: `mut-${this.nextMutationId++}`,
            type,
            path,
            payload,
            timestamp: Date.now(),
            source,
            metadata
        };

        // Add to pending mutations for batching
        this.pendingMutations.push(mutation);

        // Apply immediately if not batching
        if (!this.batchUpdates) {
            await this.applyPendingMutations();
        }
    }

    /**
     * Set a value at path
     */
    async set(path: string[], value: any, source?: Component): Promise<void> {
        await this.dispatch(MutationType.Set, path, value, source);
    }

    /**
     * Update a value at path with function
     */
    async update(path: string[], updater: (current: any) => any, source?: Component): Promise<void> {
        const current = this.getState(path);
        const newValue = updater(current);
        await this.dispatch(MutationType.Update, path, newValue, source);
    }

    /**
     * Delete a property at path
     */
    async delete(path: string[], source?: Component): Promise<void> {
        await this.dispatch(MutationType.Delete, path, null, source);
    }

    /**
     * Merge object at path
     */
    async merge(path: string[], value: any, source?: Component): Promise<void> {
        await this.dispatch(MutationType.Merge, path, value, source);
    }

    /**
     * Push to array at path
     */
    async push(path: string[], value: any, source?: Component): Promise<void> {
        await this.dispatch(MutationType.Push, path, value, source);
    }

    /**
     * Pop from array at path
     */
    async pop(path: string[], source?: Component): Promise<void> {
        await this.dispatch(MutationType.Pop, path, null, source);
    }

    /**
     * Batch multiple mutations
     */
    async batch(fn: () => void | Promise<void>): Promise<void> {
        this.batchUpdates = true;
        this.pendingMutations = [];

        try {
            await fn();
            await this.applyPendingMutations();
        } finally {
            this.batchUpdates = false;
            this.pendingMutations = [];
        }
    }

    /**
     * Add middleware for state mutations
     */
    use(middleware: StateMiddleware): void {
        this.middlewares.push(middleware);
    }

    /**
     * Add validator for state path
     */
    addValidator(path: string, validator: StateValidator): void {
        if (!this.validators.has(path)) {
            this.validators.set(path, []);
        }
        this.validators.get(path)!.push(validator);
    }

    /**
     * Get mutation history
     */
    getHistory(limit?: number): Mutation[] {
        if (limit) {
            return this.mutations.slice(-limit);
        }
        return [...this.mutations];
    }

    /**
     * Create state snapshot
     */
    createSnapshot(description?: string): string {
        const snapshot: StateSnapshot = {
            id: `snap-${Date.now()}`,
            state: this.deepClone(this.state),
            timestamp: Date.now(),
            description
        };

        this.history.push(snapshot);
        this.currentIndex = this.history.length - 1;

        // Trim history if needed
        if (this.history.length > this.config.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }

        return snapshot.id;
    }

    /**
     * Restore state from snapshot
     */
    async restoreSnapshot(snapshotId: string): Promise<void> {
        const index = this.history.findIndex(s => s.id === snapshotId);
        if (index === -1) {
            throw new Error(`Snapshot '${snapshotId}' not found`);
        }

        const snapshot = this.history[index];
        this.state = this.deepClone(snapshot.state);
        this.currentIndex = index;

        // Notify all subscribers
        await this.notifyAllSubscribers(snapshot.mutation);

        // Emit event
        await this.eventBus.emit(EventType.Custom, {
            type: 'state-restored',
            snapshotId,
            timestamp: snapshot.timestamp
        });
    }

    /**
     * Time travel to previous state
     */
    async timeTravelBack(): Promise<boolean> {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const snapshot = this.history[this.currentIndex];
            this.state = this.deepClone(snapshot.state);

            await this.notifyAllSubscribers(snapshot.mutation);
            return true;
        }
        return false;
    }

    /**
     * Time travel to next state
     */
    async timeTravelForward(): Promise<boolean> {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            const snapshot = this.history[this.currentIndex];
            this.state = this.deepClone(snapshot.state);

            await this.notifyAllSubscribers(snapshot.mutation);
            return true;
        }
        return false;
    }

    /**
     * Get available snapshots
     */
    getSnapshots(): StateSnapshot[] {
        return [...this.history];
    }

    /**
     * Reset state to initial
     */
    async reset(): Promise<void> {
        this.state = this.deepClone(this.config.initialState);
        this.mutations = [];

        if (this.config.enableHistory) {
            this.createSnapshot('Reset to initial');
        }

        await this.notifyAllSubscribers();
    }

    /**
     * Export state
     */
    export(): string {
        return JSON.stringify({
            state: this.state,
            mutations: this.mutations,
            history: this.history,
            currentIndex: this.currentIndex
        });
    }

    /**
     * Import state
     */
    async import(data: string): Promise<void> {
        try {
            const imported = JSON.parse(data);
            this.state = imported.state;
            this.mutations = imported.mutations || [];
            this.history = imported.history || [];
            this.currentIndex = imported.currentIndex || -1;

            await this.notifyAllSubscribers();
        } catch (error) {
            throw new Error('Invalid state data');
        }
    }

    /**
     * Apply pending mutations
     */
    private async applyPendingMutations(): Promise<void> {
        for (const mutation of this.pendingMutations) {
            await this.applyMutation(mutation);
        }
        this.pendingMutations = [];
    }

    /**
     * Apply a single mutation
     */
    private async applyMutation(mutation: Mutation): Promise<void> {
        // Validate mutation
        const validationError = this.validateMutation(mutation);
        if (validationError) {
            throw new Error(`Validation failed: ${validationError}`);
        }

        // Create new state if immutable
        let newState = this.config.immutable ?
            this.deepClone(this.state) : this.state;

        // Apply mutation
        switch (mutation.type) {
            case MutationType.Set:
                this.setNestedValue(newState, mutation.path, mutation.payload);
                break;
            case MutationType.Update:
                const current = this.getNestedValue(newState, mutation.path);
                this.setNestedValue(newState, mutation.path, mutation.payload);
                break;
            case MutationType.Delete:
                this.deleteNestedValue(newState, mutation.path);
                break;
            case MutationType.Merge:
                const existing = this.getNestedValue(newState, mutation.path) || {};
                this.setNestedValue(newState, mutation.path, { ...existing, ...mutation.payload });
                break;
            case MutationType.Push:
                const arr = this.getNestedValue(newState, mutation.path) || [];
                arr.push(mutation.payload);
                this.setNestedValue(newState, mutation.path, arr);
                break;
            case MutationType.Pop:
                const arr2 = this.getNestedValue(newState, mutation.path);
                if (arr2 && Array.isArray(arr2)) {
                    arr2.pop();
                    this.setNestedValue(newState, mutation.path, arr2);
                }
                break;
            case MutationType.Shift:
                const arr3 = this.getNestedValue(newState, mutation.path);
                if (arr3 && Array.isArray(arr3)) {
                    arr3.shift();
                    this.setNestedValue(newState, mutation.path, arr3);
                }
                break;
            case MutationType.Unshift:
                const arr4 = this.getNestedValue(newState, mutation.path) || [];
                arr4.unshift(mutation.payload);
                this.setNestedValue(newState, mutation.path, arr4);
                break;
            case MutationType.Splice:
                const arr5 = this.getNestedValue(newState, mutation.path);
                if (arr5 && Array.isArray(arr5)) {
                    const [start, deleteCount, ...items] = mutation.payload;
                    arr5.splice(start, deleteCount, ...items);
                    this.setNestedValue(newState, mutation.path, arr5);
                }
                break;
        }

        // Update state
        this.state = newState;

        // Store mutation
        this.mutations.push(mutation);

        // Create snapshot if enabled
        if (this.config.enableHistory) {
            this.createSnapshot(mutation.type);
        }

        // Notify subscribers
        await this.notifySubscribers(mutation);

        // Emit event
        await this.eventBus.emit(EventType.ComponentStateChanged, {
            mutation,
            state: this.state
        });
    }

    /**
     * Notify subscribers of state change
     */
    private async notifySubscribers(mutation: Mutation): Promise<void> {
        const mutationPath = mutation.path.join('.');

        for (const [path, subscriptions] of this.subscriptions) {
            for (const subscription of subscriptions) {
                let shouldNotify = false;

                // Check if subscription path matches mutation
                for (const subPath of subscription.paths) {
                    if (subPath === path) {
                        shouldNotify = true;
                        break;
                    }

                    // Check for deep subscriptions
                    if (subscription.deep && this.isPathMatch(subPath, mutationPath)) {
                        shouldNotify = true;
                        break;
                    }

                    // Check if mutation affects subscription path
                    if (mutationPath.startsWith(subPath)) {
                        shouldNotify = true;
                        break;
                    }
                }

                if (shouldNotify) {
                    try {
                        const state = this.getState(subscription.paths[0]);
                        subscription.handler(state, mutation);
                    } catch (error) {
                        console.error('State subscription error:', error);
                    }
                }
            }
        }
    }

    /**
     * Notify all subscribers
     */
    private async notifyAllSubscribers(mutation?: Mutation): Promise<void> {
        for (const [path, subscriptions] of this.subscriptions) {
            for (const subscription of subscriptions) {
                try {
                    const state = this.getState(subscription.paths[0]);
                    subscription.handler(state, mutation);
                } catch (error) {
                    console.error('State subscription error:', error);
                }
            }
        }
    }

    /**
     * Validate mutation
     */
    private validateMutation(mutation: Mutation): string | null {
        const path = mutation.path.join('.');

        // Check validators
        for (const [validatorPath, validators] of this.validators) {
            if (path.startsWith(validatorPath)) {
                for (const validator of validators) {
                    const result = validator(this.state, mutation);
                    if (result !== true) {
                        return typeof result === 'string' ? result : 'Validation failed';
                    }
                }
            }
        }

        return null;
    }

    /**
     * Check if paths match
     */
    private isPathMatch(subPath: string, mutationPath: string): boolean {
        return mutationPath.startsWith(subPath);
    }

    /**
     * Get nested value
     */
    private getNestedValue(obj: any, path: string[]): any {
        let current = obj;
        for (const key of path) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }
        return current;
    }

    /**
     * Set nested value
     */
    private setNestedValue(obj: any, path: string[], value: any): void {
        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        current[path[path.length - 1]] = value;
    }

    /**
     * Delete nested value
     */
    private deleteNestedValue(obj: any, path: string[]): void {
        if (path.length === 0) return;

        let current = obj;
        for (let i = 0; i < path.length - 1; i++) {
            const key = path[i];
            if (!current[key] || typeof current[key] !== 'object') {
                return;
            }
            current = current[key];
        }

        delete current[path[path.length - 1]];
    }

    /**
     * Deep clone object
     */
    private deepClone(obj: any): any {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return new Date(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item));
        }

        const cloned: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }

        return cloned;
    }
}