import type { Component } from './types';

/**
 * Task priority levels
 */
export enum TaskPriority {
    Immediate = 0,
    High = 1,
    Normal = 2,
    Low = 3,
    Idle = 4
}

/**
 * Task status
 */
export enum TaskStatus {
    Pending = 'pending',
    Running = 'running',
    Completed = 'completed',
    Cancelled = 'cancelled',
    Failed = 'failed'
}

/**
 * Animation easing functions
 */
export enum EasingFunction {
    Linear = 'linear',
    EaseIn = 'ease-in',
    EaseOut = 'ease-out',
    EaseInOut = 'ease-in-out',
    EaseInQuad = 'ease-in-quad',
    EaseOutQuad = 'ease-out-quad',
    EaseInCubic = 'ease-in-cubic',
    EaseOutCubic = 'ease-out-cubic',
    Bounce = 'bounce',
    Elastic = 'elastic'
}

/**
 * Task interface
 */
export interface Task {
    id: string;
    fn: () => void | Promise<void>;
    priority: TaskPriority;
    status: TaskStatus;
    createdAt: number;
    scheduledAt: number;
    timeout?: number;
    interval?: number;
    repeat?: number;
    component?: Component;
    metadata?: Record<string, any>;
}

/**
 * Animation interface
 */
export interface Animation {
    id: string;
    target: Component;
    property: string;
    from: number;
    to: number;
    duration: number;
    easing: EasingFunction;
    startTime: number;
    onUpdate?: (value: number) => void;
    onComplete?: () => void;
    onCancel?: () => void;
}

/**
 * Frame metrics
 */
export interface FrameMetrics {
    fps: number;
    frameTime: number;
    totalFrames: number;
    droppedFrames: number;
    averageFrameTime: number;
    lastFrameTime: number;
}

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
    targetFPS: number;
    maxTasks: number;
    frameTimeout: number;
    enableMetrics: boolean;
    enableAdaptiveFPS: boolean;
    adaptiveThreshold: number;
}

/**
 * High-performance scheduler with animation loop
 */
export class Scheduler {
    private tasks: Task[];
    private animations: Map<string, Animation>;
    private running: boolean;
    private frameId: number | null;
    private lastFrameTime: number;
    private frameCallbacks: Map<number, (() => void)[]>;
    private nextTaskId: number;
    private nextAnimationId: number;

    // Metrics
    private metrics: FrameMetrics;
    private frameTimes: number[];
    private maxFrameTimeSamples: number;

    // Configuration
    private config: SchedulerConfig;

    // Callbacks
    private onBeforeFrame?: () => void;
    private onAfterFrame?: () => void;
    private onError?: (error: Error, task?: Task) => void;

    constructor(config: Partial<SchedulerConfig> = {}) {
        this.config = {
            targetFPS: 60,
            maxTasks: 1000,
            frameTimeout: 16,
            enableMetrics: false,
            enableAdaptiveFPS: false,
            adaptiveThreshold: 10,
            ...config
        };

        this.tasks = [];
        this.animations = new Map();
        this.frameCallbacks = new Map();
        this.running = false;
        this.frameId = null;
        this.lastFrameTime = 0;
        this.nextTaskId = 0;
        this.nextAnimationId = 0;

        // Initialize metrics
        this.metrics = {
            fps: 0,
            frameTime: 0,
            totalFrames: 0,
            droppedFrames: 0,
            averageFrameTime: 0,
            lastFrameTime: 0
        };
        this.frameTimes = [];
        this.maxFrameTimeSamples = 60;
    }

    /**
     * Start the scheduler
     */
    start(): void {
        if (this.running) return;

        this.running = true;
        this.lastFrameTime = performance.now();
        this.scheduleNextFrame();
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        this.running = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    /**
     * Schedule a task
     */
    scheduleTask(
        fn: () => void | Promise<void>,
        priority: TaskPriority = TaskPriority.Normal,
        delay = 0,
        component?: Component,
        metadata?: Record<string, any>
    ): string {
        const task: Task = {
            id: `task-${this.nextTaskId++}`,
            fn,
            priority,
            status: TaskStatus.Pending,
            createdAt: Date.now(),
            scheduledAt: Date.now() + delay,
            component,
            metadata
        };

        this.tasks.push(task);

        // Sort tasks by priority and schedule time
        this.sortTasks();

        return task.id;
    }

    /**
     * Schedule a repeating task
     */
    scheduleRepeatingTask(
        fn: () => void | Promise<void>,
        interval: number,
        repeat?: number,
        priority: TaskPriority = TaskPriority.Normal,
        component?: Component
    ): string {
        const task: Task = {
            id: `task-${this.nextTaskId++}`,
            fn,
            priority,
            status: TaskStatus.Pending,
            createdAt: Date.now(),
            scheduledAt: Date.now() + interval,
            interval,
            repeat,
            component
        };

        this.tasks.push(task);
        this.sortTasks();

        return task.id;
    }

    /**
     * Cancel a task
     */
    cancelTask(taskId: string): boolean {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            this.tasks[index].status = TaskStatus.Cancelled;
            return true;
        }
        return false;
    }

    /**
     * Schedule an animation
     */
    animate(
        target: Component,
        property: string,
        from: number,
        to: number,
        duration: number,
        easing: EasingFunction = EasingFunction.Linear,
        onUpdate?: (value: number) => void,
        onComplete?: () => void
    ): string {
        const animation: Animation = {
            id: `anim-${this.nextAnimationId++}`,
            target,
            property,
            from,
            to,
            duration,
            easing,
            startTime: performance.now(),
            onUpdate,
            onComplete
        };

        this.animations.set(animation.id, animation);
        return animation.id;
    }

    /**
     * Cancel an animation
     */
    cancelAnimation(animationId: string): boolean {
        const animation = this.animations.get(animationId);
        if (animation) {
            if (animation.onCancel) {
                animation.onCancel();
            }
            this.animations.delete(animationId);
            return true;
        }
        return false;
    }

    /**
     * Schedule a callback for next frame
     */
    requestFrame(callback: () => void): number {
        const frameId = this.metrics.totalFrames + 1;
        const callbacks = this.frameCallbacks.get(frameId) || [];
        callbacks.push(callback);
        this.frameCallbacks.set(frameId, callbacks);
        return frameId;
    }

    /**
     * Cancel frame callback
     */
    cancelFrameCallback(frameId: number, callback: () => void): boolean {
        const callbacks = this.frameCallbacks.get(frameId);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Throttle a function to run at most once per frame
     */
    throttle<T extends (...args: any[]) => any>(fn: T): T {
        let lastCall = 0;
        let scheduled = false;

        return ((...args: any[]) => {
            const now = performance.now();

            if (now - lastCall >= 1000 / this.config.targetFPS) {
                lastCall = now;
                fn.apply(this, args);
            } else if (!scheduled) {
                scheduled = true;
                this.requestFrame(() => {
                    fn.apply(this, args);
                    scheduled = false;
                });
            }
        }) as T;
    }

    /**
     * Debounce a function to run after delay
     */
    debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
        let timeoutId: any;

        return ((...args: any[]) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => fn.apply(this, args), delay);
        }) as T;
    }

    /**
     * Set frame callbacks
     */
    setFrameCallbacks(
        onBeforeFrame?: () => void,
        onAfterFrame?: () => void,
        onError?: (error: Error, task?: Task) => void
    ): void {
        this.onBeforeFrame = onBeforeFrame;
        this.onAfterFrame = onAfterFrame;
        this.onError = onError;
    }

    /**
     * Get current metrics
     */
    getMetrics(): FrameMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset metrics
     */
    resetMetrics(): void {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            totalFrames: 0,
            droppedFrames: 0,
            averageFrameTime: 0,
            lastFrameTime: 0
        };
        this.frameTimes = [];
    }

    /**
     * Get task count by status
     */
    getTaskCount(): Record<TaskStatus, number> {
        const counts = {
            [TaskStatus.Pending]: 0,
            [TaskStatus.Running]: 0,
            [TaskStatus.Completed]: 0,
            [TaskStatus.Cancelled]: 0,
            [TaskStatus.Failed]: 0
        };

        for (const task of this.tasks) {
            counts[task.status]++;
        }

        return counts;
    }

    /**
     * Get active animations
     */
    getActiveAnimations(): Animation[] {
        return Array.from(this.animations.values());
    }

    /**
     * Clear all tasks and animations
     */
    clear(): void {
        this.tasks = [];
        this.animations.clear();
        this.frameCallbacks.clear();
    }

    /**
     * Main animation loop
     */
    private animationLoop = (currentTime: number): void => {
        if (!this.running) return;

        const frameStart = performance.now();

        // Call before frame callback
        if (this.onBeforeFrame) {
            this.onBeforeFrame();
        }

        try {
            // Update metrics
            if (this.config.enableMetrics) {
                this.updateMetrics(currentTime);
            }

            // Process tasks
            this.processTasks(currentTime);

            // Update animations
            this.updateAnimations(currentTime);

            // Execute frame callbacks
            this.executeFrameCallbacks();

            // Adaptive FPS adjustment
            if (this.config.enableAdaptiveFPS) {
                this.adjustFPS();
            }
        } catch (error) {
            if (this.onError) {
                this.onError(error as Error);
            } else {
                console.error('Scheduler error:', error);
            }
        }

        // Call after frame callback
        if (this.onAfterFrame) {
            this.onAfterFrame();
        }

        this.lastFrameTime = currentTime;

        // Schedule next frame
        this.scheduleNextFrame();
    };

    /**
     * Schedule next frame
     */
    private scheduleNextFrame(): void {
        if (this.running) {
            const targetFrameTime = 1000 / this.config.targetFPS;
            const delay = Math.max(0, targetFrameTime - (performance.now() - this.lastFrameTime));

            this.frameId = setTimeout(() => {
                this.frameId = requestAnimationFrame(this.animationLoop);
            }, delay);
        }
    }

    /**
     * Process pending tasks
     */
    private async processTasks(currentTime: number): Promise<void> {
        const now = Date.now();
        const tasksToRun: Task[] = [];

        // Find tasks ready to run
        for (let i = 0; i < this.tasks.length && tasksToRun.length < this.config.maxTasks; i++) {
            const task = this.tasks[i];

            if (task.status === TaskStatus.Pending && task.scheduledAt <= now) {
                tasksToRun.push(task);
                task.status = TaskStatus.Running;
            }
        }

        // Execute tasks
        for (const task of tasksToRun) {
            try {
                await task.fn();
                task.status = TaskStatus.Completed;

                // Handle repeating tasks
                if (task.interval) {
                    task.scheduledAt = now + task.interval;
                    task.status = TaskStatus.Pending;

                    if (task.repeat !== undefined) {
                        task.repeat--;
                        if (task.repeat <= 0) {
                            task.interval = undefined;
                        }
                    }
                }
            } catch (error) {
                task.status = TaskStatus.Failed;
                if (this.onError) {
                    this.onError(error as Error, task);
                }
            }
        }

        // Clean up completed tasks
        this.tasks = this.tasks.filter(task =>
            task.status === TaskStatus.Pending ||
            task.status === TaskStatus.Running ||
            (task.status === TaskStatus.Failed && task.interval)
        );

        // Re-sort tasks
        this.sortTasks();
    }

    /**
     * Update animations
     */
    private updateAnimations(currentTime: number): void {
        const completedAnimations: string[] = [];

        for (const [id, animation] of this.animations) {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);

            // Apply easing
            const easedProgress = this.applyEasing(progress, animation.easing);

            // Calculate value
            const value = animation.from + (animation.to - animation.from) * easedProgress;

            // Update component property
            if (animation.target.state.data) {
                animation.target.state.data[animation.property] = value;
                animation.target.state.dirty = true;
            }

            // Call update callback
            if (animation.onUpdate) {
                animation.onUpdate(value);
            }

            // Check completion
            if (progress >= 1) {
                if (animation.onComplete) {
                    animation.onComplete();
                }
                completedAnimations.push(id);
            }
        }

        // Remove completed animations
        for (const id of completedAnimations) {
            this.animations.delete(id);
        }
    }

    /**
     * Execute frame callbacks
     */
    private executeFrameCallbacks(): void {
        const frameId = this.metrics.totalFrames;
        const callbacks = this.frameCallbacks.get(frameId);

        if (callbacks) {
            for (const callback of callbacks) {
                try {
                    callback();
                } catch (error) {
                    console.error('Frame callback error:', error);
                }
            }
            this.frameCallbacks.delete(frameId);
        }
    }

    /**
     * Apply easing function
     */
    private applyEasing(t: number, easing: EasingFunction): number {
        switch (easing) {
            case EasingFunction.Linear:
                return t;
            case EasingFunction.EaseIn:
                return t * t;
            case EasingFunction.EaseOut:
                return 1 - (1 - t) * (1 - t);
            case EasingFunction.EaseInOut:
                return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            case EasingFunction.EaseInQuad:
                return t * t;
            case EasingFunction.EaseOutQuad:
                return 1 - (1 - t) * (1 - t);
            case EasingFunction.EaseInCubic:
                return t * t * t;
            case EasingFunction.EaseOutCubic:
                return 1 - Math.pow(1 - t, 3);
            case EasingFunction.Bounce:
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            case EasingFunction.Elastic:
                return t === 0 ? 0 : t === 1 ? 1 :
                    -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
            default:
                return t;
        }
    }

    /**
     * Sort tasks by priority and schedule time
     */
    private sortTasks(): void {
        this.tasks.sort((a, b) => {
            if (a.priority !== b.priority) {
                return a.priority - b.priority;
            }
            return a.scheduledAt - b.scheduledAt;
        });
    }

    /**
     * Update frame metrics
     */
    private updateMetrics(currentTime: number): void {
        this.metrics.totalFrames++;
        this.metrics.lastFrameTime = currentTime - this.lastFrameTime;
        this.frameTimes.push(this.metrics.lastFrameTime);

        // Maintain sample size
        if (this.frameTimes.length > this.maxFrameTimeSamples) {
            this.frameTimes.shift();
        }

        // Calculate average frame time
        this.metrics.averageFrameTime =
            this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

        // Calculate FPS
        this.metrics.fps = 1000 / this.metrics.averageFrameTime;

        // Check for dropped frames
        if (this.metrics.lastFrameTime > 1000 / this.config.targetFPS * 1.5) {
            this.metrics.droppedFrames++;
        }
    }

    /**
     * Adaptive FPS adjustment
     */
    private adjustFPS(): void {
        if (this.metrics.averageFrameTime > 1000 / this.config.targetFPS * this.config.adaptiveThreshold) {
            // Reduce target FPS if struggling
            this.config.targetFPS = Math.max(30, this.config.targetFPS - 5);
        } else if (this.metrics.averageFrameTime < 1000 / this.config.targetFPS * 0.5) {
            // Increase target FPS if performing well
            this.config.targetFPS = Math.min(120, this.config.targetFPS + 5);
        }
    }
}