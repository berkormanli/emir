import type { Component } from './types';

/**
 * Diagnostic severity levels
 */
export enum DiagnosticSeverity {
    Info = 'info',
    Warning = 'warning',
    Error = 'error',
    Critical = 'critical'
}

/**
 * Diagnostic category
 */
export enum DiagnosticCategory {
    Performance = 'performance',
    Memory = 'memory',
    Event = 'event',
    Component = 'component',
    Input = 'input',
    Render = 'render',
    Network = 'network',
    System = 'system'
}

/**
 * Diagnostic entry
 */
export interface Diagnostic {
    id: string;
    severity: DiagnosticSeverity;
    category: DiagnosticCategory;
    message: string;
    timestamp: number;
    source?: Component | string;
    data?: any;
    stack?: string;
    resolved: boolean;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    fps: number;
    frameTime: number;
    renderTime: number;
    updateTime: number;
    eventProcessingTime: number;
    memoryUsage: number;
    componentCount: number;
    activeAnimations: number;
    eventQueueSize: number;
    stateSubscriptionCount: number;
    averageComponentRenderTime: number;
}

/**
 * Memory usage snapshot
 */
export interface MemorySnapshot {
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    componentCount: number;
    eventCount: number;
}

/**
 * Error overlay configuration
 */
export interface ErrorOverlayConfig {
    enabled: boolean;
    maxErrors: number;
    autoHideDelay: number;
    showStackTrace: boolean;
    showTimestamp: boolean;
    categories: DiagnosticCategory[];
}

/**
 * Performance counter configuration
 */
export interface PerfCounterConfig {
    enabled: boolean;
    updateInterval: number;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showFPS: boolean;
    showMemory: boolean;
    showComponents: boolean;
    showEvents: boolean;
}

/**
 * Runtime diagnostics system
 */
export class RuntimeDiagnostics {
    private diagnostics: Diagnostic[];
    private performanceMetrics: PerformanceMetrics;
    private memorySnapshots: MemorySnapshot[];
    private errorOverlay: ErrorOverlayConfig;
    private perfCounter: PerfCounterConfig;
    private enabled: boolean;
    private updateInterval: any;
    private nextDiagnosticId: number;
    private errorCounts: Map<string, number>;
    private warningCounts: Map<string, number>;
    private performanceHistory: number[][];
    private maxHistorySize: number;

    constructor() {
        this.diagnostics = [];
        this.performanceMetrics = this.initializeMetrics();
        this.memorySnapshots = [];
        this.nextDiagnosticId = 0;
        this.errorCounts = new Map();
        this.warningCounts = new Map();
        this.performanceHistory = [];
        this.maxHistorySize = 300; // 5 minutes at 60 FPS

        this.errorOverlay = {
            enabled: false,
            maxErrors: 10,
            autoHideDelay: 5000,
            showStackTrace: true,
            showTimestamp: true,
            categories: [
                DiagnosticCategory.Error,
                DiagnosticCategory.Critical
            ]
        };

        this.perfCounter = {
            enabled: false,
            updateInterval: 1000,
            position: 'top-right',
            showFPS: true,
            showMemory: true,
            showComponents: true,
            showEvents: true
        };

        this.enabled = false;
    }

    /**
     * Enable diagnostics
     */
    enable(): void {
        this.enabled = true;
        this.startMetricsCollection();
    }

    /**
     * Disable diagnostics
     */
    disable(): void {
        this.enabled = false;
        this.stopMetricsCollection();
    }

    /**
     * Log a diagnostic entry
     */
    log(
        severity: DiagnosticSeverity,
        category: DiagnosticCategory,
        message: string,
        source?: Component | string,
        data?: any,
        stack?: string
    ): void {
        if (!this.enabled) return;

        const diagnostic: Diagnostic = {
            id: `diag-${this.nextDiagnosticId++}`,
            severity,
            category,
            message,
            timestamp: Date.now(),
            source,
            data,
            stack,
            resolved: false
        };

        this.diagnostics.push(diagnostic);

        // Track error/warning counts
        if (severity === DiagnosticSeverity.Error || severity === DiagnosticSeverity.Critical) {
            const key = `${category}:${message}`;
            const count = this.errorCounts.get(key) || 0;
            this.errorCounts.set(key, count + 1);
        } else if (severity === DiagnosticSeverity.Warning) {
            const key = `${category}:${message}`;
            const count = this.warningCounts.get(key) || 0;
            this.warningCounts.set(key, count + 1);
        }

        // Trim diagnostics
        if (this.diagnostics.length > 1000) {
            this.diagnostics.shift();
        }

        // Update error overlay if enabled
        if (this.errorOverlay.enabled && this.shouldShowInOverlay(diagnostic)) {
            this.updateErrorOverlay();
        }

        // Auto-resolve errors after delay
        if (severity === DiagnosticSeverity.Warning && this.errorOverlay.autoHideDelay > 0) {
            setTimeout(() => {
                this.resolveDiagnostic(diagnostic.id);
            }, this.errorOverlay.autoHideDelay);
        }
    }

    /**
     * Log an error
     */
    error(
        category: DiagnosticCategory,
        message: string,
        source?: Component | string,
        error?: Error
    ): void {
        this.log(
            DiagnosticSeverity.Error,
            category,
            message,
            source,
            error,
            error?.stack
        );
    }

    /**
     * Log a warning
     */
    warning(
        category: DiagnosticCategory,
        message: string,
        source?: Component | string,
        data?: any
    ): void {
        this.log(
            DiagnosticSeverity.Warning,
            category,
            message,
            source,
            data
        );
    }

    /**
     * Log info
     */
    info(
        category: DiagnosticCategory,
        message: string,
        source?: Component | string,
        data?: any
    ): void {
        this.log(
            DiagnosticSeverity.Info,
            category,
            message,
            source,
            data
        );
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
        if (!this.enabled) return;

        Object.assign(this.performanceMetrics, metrics);

        // Store in history
        const values = [
            metrics.fps || this.performanceMetrics.fps,
            metrics.frameTime || this.performanceMetrics.frameTime,
            metrics.renderTime || this.performanceMetrics.renderTime,
            metrics.updateTime || this.performanceMetrics.updateTime,
            metrics.memoryUsage || this.performanceMetrics.memoryUsage
        ];

        this.performanceHistory.push(values);

        if (this.performanceHistory.length > this.maxHistorySize) {
            this.performanceHistory.shift();
        }

        // Check for performance issues
        this.checkPerformanceIssues();
    }

    /**
     * Create memory snapshot
     */
    createMemorySnapshot(componentCount: number, eventCount: number): void {
        if (!this.enabled) return;

        const usage = process.memoryUsage();
        const snapshot: MemorySnapshot = {
            timestamp: Date.now(),
            heapUsed: usage.heapUsed,
            heapTotal: usage.heapTotal,
            external: usage.external,
            rss: usage.rss,
            componentCount,
            eventCount
        };

        this.memorySnapshots.push(snapshot);

        // Keep only last 100 snapshots
        if (this.memorySnapshots.length > 100) {
            this.memorySnapshots.shift();
        }

        // Check for memory leaks
        this.checkMemoryLeaks();
    }

    /**
     * Get diagnostics
     */
    getDiagnostics(
        severity?: DiagnosticSeverity,
        category?: DiagnosticCategory,
        resolved = false
    ): Diagnostic[] {
        return this.diagnostics.filter(d => {
            if (severity && d.severity !== severity) return false;
            if (category && d.category !== category) return false;
            if (d.resolved !== resolved) return false;
            return true;
        });
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics {
        return { ...this.performanceMetrics };
    }

    /**
     * Get memory snapshots
     */
    getMemorySnapshots(limit?: number): MemorySnapshot[] {
        if (limit) {
            return this.memorySnapshots.slice(-limit);
        }
        return [...this.memorySnapshots];
    }

    /**
     * Get performance averages
     */
    getPerformanceAverages(duration = 5000): Partial<PerformanceMetrics> {
        const now = Date.now();
        const cutoff = now - duration;
        const relevant = this.performanceHistory.filter(
            (_, i) => {
                const timestamp = now - (this.performanceHistory.length - i) * 16;
                return timestamp >= cutoff;
            }
        );

        if (relevant.length === 0) return {};

        const averages = relevant.reduce((acc, curr) => {
            acc[0] += curr[0]; // fps
            acc[1] += curr[1]; // frameTime
            acc[2] += curr[2]; // renderTime
            acc[3] += curr[3]; // updateTime
            acc[4] += curr[4]; // memoryUsage
            return acc;
        }, [0, 0, 0, 0, 0]);

        const count = relevant.length;

        return {
            fps: averages[0] / count,
            frameTime: averages[1] / count,
            renderTime: averages[2] / count,
            updateTime: averages[3] / count,
            memoryUsage: averages[4] / count
        };
    }

    /**
     * Resolve a diagnostic
     */
    resolveDiagnostic(id: string): boolean {
        const diagnostic = this.diagnostics.find(d => d.id === id);
        if (diagnostic) {
            diagnostic.resolved = true;
            return true;
        }
        return false;
    }

    /**
     * Clear all diagnostics
     */
    clearDiagnostics(): void {
        this.diagnostics = [];
        this.errorCounts.clear();
        this.warningCounts.clear();
    }

    /**
     * Configure error overlay
     */
    configureErrorOverlay(config: Partial<ErrorOverlayConfig>): void {
        this.errorOverlay = { ...this.errorOverlay, ...config };
    }

    /**
     * Configure performance counter
     */
    configurePerfCounter(config: Partial<PerfCounterConfig>): void {
        this.perfCounter = { ...this.perfCounter, ...config };
        if (this.enabled) {
            this.restartMetricsCollection();
        }
    }

    /**
     * Generate diagnostic report
     */
    generateReport(): string {
        const report: string[] = [];

        // Summary
        const errors = this.getDiagnostics(DiagnosticSeverity.Error);
        const warnings = this.getDiagnostics(DiagnosticSeverity.Warning);
        const criticals = this.getDiagnostics(DiagnosticSeverity.Critical);

        report.push('=== Runtime Diagnostics Report ===');
        report.push(`Generated: ${new Date().toISOString()}`);
        report.push('');
        report.push('Summary:');
        report.push(`  Errors: ${errors.length}`);
        report.push(`  Warnings: ${warnings.length}`);
        report.push(`  Critical: ${criticals.length}`);
        report.push('');

        // Performance
        report.push('Performance:');
        report.push(`  Average FPS: ${this.performanceMetrics.fps.toFixed(2)}`);
        report.push(`  Frame Time: ${this.performanceMetrics.frameTime.toFixed(2)}ms`);
        report.push(`  Memory Usage: ${(this.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
        report.push('');

        // Top errors
        const topErrors = Array.from(this.errorCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (topErrors.length > 0) {
            report.push('Top Errors:');
            for (const [key, count] of topErrors) {
                report.push(`  ${key}: ${count} occurrences`);
            }
            report.push('');
        }

        // Recent errors
        const recentErrors = errors.slice(-5);
        if (recentErrors.length > 0) {
            report.push('Recent Errors:');
            for (const error of recentErrors) {
                report.push(`  [${new Date(error.timestamp).toISOString()}] ${error.message}`);
            }
        }

        return report.join('\n');
    }

    /**
     * Start metrics collection
     */
    private startMetricsCollection(): void {
        this.stopMetricsCollection();

        this.updateInterval = setInterval(() => {
            this.collectMetrics();
        }, this.perfCounter.updateInterval);
    }

    /**
     * Stop metrics collection
     */
    private stopMetricsCollection(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = undefined;
        }
    }

    /**
     * Restart metrics collection
     */
    private restartMetricsCollection(): void {
        this.stopMetricsCollection();
        if (this.perfCounter.enabled) {
            this.startMetricsCollection();
        }
    }

    /**
     * Collect system metrics
     */
    private collectMetrics(): void {
        const usage = process.memoryUsage();
        this.performanceMetrics.memoryUsage = usage.heapUsed;
        this.performanceMetrics.heapTotal = usage.heapTotal;
        this.performanceMetrics.external = usage.external;
        this.performanceMetrics.rss = usage.rss;

        // Update performance counter display if enabled
        if (this.perfCounter.enabled) {
            this.updatePerformanceCounter();
        }
    }

    /**
     * Check for performance issues
     */
    private checkPerformanceIssues(): void {
        const metrics = this.performanceMetrics;

        // Low FPS
        if (metrics.fps < 30) {
            this.warning(
                DiagnosticCategory.Performance,
                `Low FPS detected: ${metrics.fps.toFixed(1)}`
            );
        }

        // High frame time
        if (metrics.frameTime > 33) { // > 30 FPS
            this.warning(
                DiagnosticCategory.Performance,
                `High frame time detected: ${metrics.frameTime.toFixed(2)}ms`
            );
        }

        // High memory usage
        if (metrics.memoryUsage > 100 * 1024 * 1024) { // > 100MB
            this.warning(
                DiagnosticCategory.Memory,
                `High memory usage detected: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
            );
        }
    }

    /**
     * Check for memory leaks
     */
    private checkMemoryLeaks(): void {
        if (this.memorySnapshots.length < 10) return;

        const recent = this.memorySnapshots.slice(-10);
        const memoryGrowth = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
        const avgGrowthRate = memoryGrowth / (recent[recent.length - 1].timestamp - recent[0].timestamp) * 1000;

        // Check if memory is growing consistently
        if (avgGrowthRate > 1024 * 1024) { // > 1MB/s
            this.warning(
                DiagnosticCategory.Memory,
                `Potential memory leak detected: ${(avgGrowthRate / 1024 / 1024).toFixed(2)}MB/s growth`
            );
        }
    }

    /**
     * Check if diagnostic should show in overlay
     */
    private shouldShowInOverlay(diagnostic: Diagnostic): boolean {
        return this.errorOverlay.categories.includes(diagnostic.category);
    }

    /**
     * Update error overlay
     */
    private updateErrorOverlay(): void {
        // This would integrate with the TUI rendering system
        // to show an error overlay on screen
        console.log('Error overlay updated');
    }

    /**
     * Update performance counter
     */
    private updatePerformanceCounter(): void {
        // This would integrate with the TUI rendering system
        // to show a performance counter on screen
        const metrics = this.performanceMetrics;
        console.log(`FPS: ${metrics.fps.toFixed(1)} | Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
    }

    /**
     * Initialize metrics
     */
    private initializeMetrics(): PerformanceMetrics {
        return {
            fps: 60,
            frameTime: 16.67,
            renderTime: 0,
            updateTime: 0,
            eventProcessingTime: 0,
            memoryUsage: 0,
            heapTotal: 0,
            external: 0,
            rss: 0,
            componentCount: 0,
            activeAnimations: 0,
            eventQueueSize: 0,
            stateSubscriptionCount: 0,
            averageComponentRenderTime: 0
        };
    }
}