import { EnhancedInputManager } from './enhanced-input-manager';
import { FocusManager, FocusDirection } from './focus-manager';
import { Scheduler, TaskPriority, EasingFunction } from './scheduler';
import { EventBus, EventType } from './event-bus';
import { StateStore, MutationType } from './state-store';
import { RuntimeDiagnostics, DiagnosticSeverity, DiagnosticCategory } from './diagnostics';
import type { Component, InputEvent } from './types';

/**
 * Runtime core configuration
 */
export interface RuntimeCoreConfig {
    enableDiagnostics?: boolean;
    enableMetrics?: boolean;
    enableLogging?: boolean;
    targetFPS?: number;
    maxHistorySize?: number;
    maxQueueSize?: number;
}

/**
 * Integrated runtime system combining all core features
 */
export class RuntimeCore {
    public inputManager: EnhancedInputManager;
    public focusManager: FocusManager;
    public scheduler: Scheduler;
    public eventBus: EventBus;
    public stateStore: StateStore;
    public diagnostics: RuntimeDiagnostics;

    private config: RuntimeCoreConfig;
    private initialized: boolean;
    private components: Map<string, Component>;
    private active: boolean;

    constructor(config: RuntimeCoreConfig = {}) {
        this.config = {
            enableDiagnostics: true,
            enableMetrics: true,
            enableLogging: false,
            targetFPS: 60,
            maxHistorySize: 1000,
            maxQueueSize: 10000,
            ...config
        };

        // Initialize core systems
        this.eventBus = new EventBus(this.config.maxQueueSize, this.config.maxHistorySize);
        this.stateStore = new StateStore(this.eventBus);
        this.diagnostics = new RuntimeDiagnostics();
        this.inputManager = new EnhancedInputManager(this.config);
        this.focusManager = new FocusManager();
        this.scheduler = new Scheduler({
            targetFPS: this.config.targetFPS,
            enableMetrics: this.config.enableMetrics
        });

        this.initialized = false;
        this.components = new Map();
        this.active = false;

        this.setupIntegration();
    }

    /**
     * Initialize the runtime core
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Enable diagnostics if configured
            if (this.config.enableDiagnostics) {
                this.diagnostics.enable();
                this.diagnostics.info(
                    DiagnosticCategory.System,
                    'Runtime Core initializing...',
                    'system'
                );
            }

            // Setup event bus integration
            this.setupEventBusIntegration();

            // Setup focus manager integration
            this.setupFocusIntegration();

            // Setup scheduler integration
            this.setupSchedulerIntegration();

            // Setup state store integration
            this.setupStateStoreIntegration();

            this.initialized = true;
            this.active = true;

            if (this.config.enableDiagnostics) {
                this.diagnostics.info(
                    DiagnosticCategory.System,
                    'Runtime Core initialized successfully',
                    'system'
                );
            }

            // Emit initialization event
            await this.eventBus.emit(EventType.System, {
                type: 'runtime-initialized',
                timestamp: Date.now()
            });

        } catch (error) {
            if (this.config.enableDiagnostics) {
                this.diagnostics.error(
                    DiagnosticCategory.System,
                    'Runtime Core initialization failed',
                    'system',
                    error as Error
                );
            }
            throw error;
        }
    }

    /**
     * Start the runtime
     */
    async start(): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        if (this.active) return;

        // Start input manager
        this.inputManager.startListening();

        // Start scheduler
        this.scheduler.start();

        // Create initial state snapshot
        this.stateStore.createSnapshot('Runtime started');

        // Start diagnostics collection
        this.startDiagnosticsCollection();

        this.active = true;

        await this.eventBus.emit(EventType.System, {
            type: 'runtime-started',
            timestamp: Date.now()
        });
    }

    /**
     * Stop the runtime
     */
    async stop(): Promise<void> {
        if (!this.active) return;

        // Stop input manager
        this.inputManager.stopListening();

        // Stop scheduler
        this.scheduler.stop();

        // Stop diagnostics collection
        this.stopDiagnosticsCollection();

        // Clear all components
        this.components.clear();

        this.active = false;

        await this.eventBus.emit(EventType.System, {
            type: 'runtime-stopped',
            timestamp: Date.now()
        });
    }

    /**
     * Register a component with the runtime
     */
    registerComponent(component: Component): void {
        if (!component.id) {
            throw new Error('Component must have an ID');
        }

        this.components.set(component.id, component);

        // Subscribe to state changes for this component
        this.stateStore.subscribe(
            `components.${component.id}`,
            (state, mutation) => {
                component.state.data = state;
                component.state.dirty = true;
            },
            { component }
        );

        // Register with focus manager if focusable
        if (this.isComponentFocusable(component)) {
            const containerId = component.state.data?.containerId || 'default';
            if (!this.focusManager['containers'].has(containerId)) {
                this.focusManager.createContainer(containerId);
            }
            this.focusManager.addComponent(component, containerId);
        }

        // Emit component created event
        this.eventBus.emit(EventType.ComponentCreated, {
            component,
            timestamp: Date.now()
        });
    }

    /**
     * Unregister a component
     */
    unregisterComponent(componentId: string): void {
        const component = this.components.get(componentId);
        if (!component) return;

        // Remove from focus manager
        this.focusManager.removeComponent(component);

        // Unsubscribe from state changes
        this.stateStore.unsubscribeAll(component);

        // Remove from components map
        this.components.delete(componentId);

        // Emit component destroyed event
        this.eventBus.emit(EventType.ComponentDestroyed, {
            component,
            timestamp: Date.now()
        });
    }

    /**
     * Get a registered component
     */
    getComponent(id: string): Component | undefined {
        return this.components.get(id);
    }

    /**
     * Get all registered components
     */
    getAllComponents(): Component[] {
        return Array.from(this.components.values());
    }

    /**
     * Update runtime state
     */
    async update(deltaTime: number): Promise<void> {
        if (!this.active) return;

        const startTime = performance.now();

        try {
            // Update performance metrics
            if (this.config.enableMetrics) {
                this.diagnostics.updatePerformanceMetrics({
                    frameTime: deltaTime,
                    componentCount: this.components.size,
                    eventQueueSize: this.eventBus['eventQueue']?.length || 0,
                    stateSubscriptionCount: this.stateStore['subscriptions']?.size || 0
                });
            }

            // Create memory snapshot periodically
            if (Math.random() < 0.01) { // ~1% chance per frame
                this.diagnostics.createMemorySnapshot(
                    this.components.size,
                    this.eventBus['eventQueue']?.length || 0
                );
            }

            // Emit update event
            await this.eventBus.emit(EventType.ComponentUpdated, {
                deltaTime,
                timestamp: Date.now()
            });

        } catch (error) {
            if (this.config.enableDiagnostics) {
                this.diagnostics.error(
                    DiagnosticCategory.System,
                    'Runtime update failed',
                    'runtime',
                    error as Error
                );
            }
        }
    }

    /**
     * Render all components
     */
    async render(): Promise<string> {
        if (!this.active) return '';

        const renderPromises = Array.from(this.components.values())
            .filter(component => component.visible && component.state.dirty)
            .map(component => {
                const startTime = performance.now();
                const output = component.render();
                const renderTime = performance.now() - startTime;

                component.state.dirty = false;

                return { component, output, renderTime };
            });

        const results = await Promise.all(renderPromises);

        // Update render metrics
        if (this.config.enableMetrics && results.length > 0) {
            const avgRenderTime = results.reduce((sum, r) => sum + r.renderTime, 0) / results.length;
            this.diagnostics.updatePerformanceMetrics({
                renderTime: avgRenderTime,
                averageComponentRenderTime: avgRenderTime
            });
        }

        return results.map(r => r.output).join('\n');
    }

    /**
     * Handle input event
     */
    async handleInput(event: InputEvent): Promise<boolean> {
        if (!this.active) return false;

        try {
            // Route to focus manager first
            const handled = this.focusManager.routeInputEvent(event);

            if (!handled) {
                // Try to route to components directly
                for (const component of this.components.values()) {
                    if (component.handleInput(event)) {
                        return true;
                    }
                }
            }

            return handled;
        } catch (error) {
            if (this.config.enableDiagnostics) {
                this.diagnostics.error(
                    DiagnosticCategory.Input,
                    'Input handling failed',
                    'input',
                    error as Error
                );
            }
            return false;
        }
    }

    /**
     * Generate runtime report
     */
    generateReport(): string {
        const sections: string[] = [];

        // Diagnostics report
        sections.push(this.diagnostics.generateReport());

        // Component summary
        sections.push('\n=== Components ===');
        sections.push(`Total components: ${this.components.size}`);
        sections.push(`Focusable components: ${Array.from(this.components.values()).filter(c => this.isComponentFocusable(c)).length}`);

        // State store summary
        sections.push('\n=== State Store ===');
        sections.push(`Total subscriptions: ${this.stateStore['subscriptions']?.size || 0}`);
        sections.push(`Total mutations: ${this.stateStore['mutations']?.length || 0}`);

        // Scheduler metrics
        sections.push('\n=== Scheduler ===');
        const schedulerMetrics = this.scheduler.getMetrics();
        sections.push(`FPS: ${schedulerMetrics.fps.toFixed(2)}`);
        sections.push(`Frame time: ${schedulerMetrics.frameTime.toFixed(2)}ms`);
        sections.push(`Total frames: ${schedulerMetrics.totalFrames}`);
        sections.push(`Dropped frames: ${schedulerMetrics.droppedFrames}`);

        return sections.join('\n');
    }

    /**
     * Setup integration between systems
     */
    private setupIntegration(): void {
        // Setup default event bus middlewares
        this.eventBus.use((event, next) => {
            // Log events if enabled
            if (this.config.enableLogging) {
                console.log(`Event: ${event.type}`, event.data);
            }
            next();
        });

        // Setup default state store middlewares
        this.stateStore.use((state, mutation, next) => {
            // Log mutations if enabled
            if (this.config.enableLogging) {
                console.log(`State mutation: ${mutation.type}`, mutation);
            }
            next();
        });
    }

    /**
     * Setup event bus integration
     */
    private setupEventBusIntegration(): void {
        // Handle errors
        this.eventBus.subscribe(EventType.Error, async (event) => {
            if (this.config.enableDiagnostics) {
                this.diagnostics.error(
                    DiagnosticCategory.Event,
                    event.data.message,
                    event.source as string,
                    event.data.error
                );
            }
        });

        // Handle component state changes
        this.eventBus.subscribe(EventType.ComponentStateChanged, async (event) => {
            const component = this.components.get(event.data.componentId);
            if (component) {
                component.state.dirty = true;
            }
        });
    }

    /**
     * Setup focus manager integration
     */
    private setupFocusIntegration(): void {
        // Listen to focus events
        this.focusManager.addFocusEventListener('focus', (event) => {
            this.stateStore.set(['focus', 'componentId'], event.target.id);
            this.eventBus.emit(EventType.ComponentFocused, {
                component: event.target,
                timestamp: Date.now()
            });
        });

        this.focusManager.addFocusEventListener('blur', (event) => {
            if (this.stateStore.getState(['focus', 'componentId']) === event.target.id) {
                this.stateStore.set(['focus', 'componentId'], null);
            }
            this.eventBus.emit(EventType.ComponentBlurred, {
                component: event.target,
                timestamp: Date.now()
            });
        });
    }

    /**
     * Setup scheduler integration
     */
    private setupSchedulerIntegration(): void {
        // Schedule regular updates
        this.scheduler.scheduleRepeatingTask(
            async () => {
                await this.update(16.67); // 60 FPS
            },
            16.67,
            undefined,
            TaskPriority.High
        );

        // Setup frame callbacks
        this.scheduler.setFrameCallbacks(
            () => {
                // Before frame
            },
            () => {
                // After frame - render dirty components
                this.render();
            },
            (error, task) => {
                if (this.config.enableDiagnostics) {
                    this.diagnostics.error(
                        DiagnosticCategory.System,
                        'Scheduler task failed',
                        'scheduler',
                        error
                    );
                }
            }
        );
    }

    /**
     * Setup state store integration
     */
    private setupStateStoreIntegration(): void {
        // Add validators
        this.stateStore.addValidator('focus', (state, mutation) => {
            if (mutation.type === MutationType.Set && mutation.payload) {
                const component = this.components.get(mutation.payload);
                if (!component || !this.isComponentFocusable(component)) {
                    return 'Cannot focus non-focusable component';
                }
            }
            return true;
        });

        // Initialize default state
        this.stateStore.set(['focus'], {
            componentId: null,
            containerId: 'default'
        });
    }

    /**
     * Start diagnostics collection
     */
    private startDiagnosticsCollection(): void {
        // Already handled by individual systems
    }

    /**
     * Stop diagnostics collection
     */
    private stopDiagnosticsCollection(): void {
        // Already handled by individual systems
    }

    /**
     * Check if component is focusable
     */
    private isComponentFocusable(component: Component): boolean {
        return component.visible && component.handleInput !== undefined;
    }
}