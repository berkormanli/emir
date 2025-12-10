/**
 * Performance benchmarking system
 */

import { performance, PerformanceObserver } from 'perf_hooks';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PseudoTerminal } from './pseudoterminal';

/**
 * Benchmark metrics
 */
export interface BenchmarkMetrics {
    name: string;
    duration: number;
    memory: {
        initial: number;
        final: number;
        peak: number;
        delta: number;
    };
    cpu: {
        user: number;
        system: number;
    };
    iterations: number;
    opsPerSecond: number;
    samples: number[];
    timestamp: number;
}

/**
 * Benchmark options
 */
export interface BenchmarkOptions {
    iterations?: number;
    warmup?: number;
    timeout?: number;
    minSamples?: number;
    maxSamples?: number;
    threshold?: number; // Coefficient of variation threshold
    outputDir?: string;
    profile?: boolean;
}

/**
 * Benchmark suite
 */
export class BenchmarkSuite {
    private benchmarks: Array<{
        name: string;
        fn: () => Promise<void> | void;
        options?: BenchmarkOptions;
    }> = [];
    private results: BenchmarkMetrics[] = [];
    private outputDir: string;

    constructor(outputDir: string = './benchmarks/results') {
        this.outputDir = outputDir;
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }
    }

    /**
     * Add a benchmark test
     */
    add(name: string, fn: () => Promise<void> | void, options?: BenchmarkOptions): this {
        this.benchmarks.push({ name, fn, options });
        return this;
    }

    /**
     * Run all benchmarks
     */
    async run(): Promise<BenchmarkMetrics[]> {
        console.log('Running benchmarks...\n');

        for (const benchmark of this.benchmarks) {
            const metrics = await this.runBenchmark(
                benchmark.name,
                benchmark.fn,
                benchmark.options
            );
            this.results.push(metrics);
            this.printMetrics(metrics);
        }

        this.saveResults();
        this.generateReport();

        return this.results;
    }

    /**
     * Run a single benchmark
     */
    private async runBenchmark(
        name: string,
        fn: () => Promise<void> | void,
        options: BenchmarkOptions = {}
    ): Promise<BenchmarkMetrics> {
        const {
            iterations = 100,
            warmup = 5,
            timeout = 30000,
            minSamples = 10,
            maxSamples = 100,
            threshold = 0.02
        } = options;

        console.log(`🏃 Running: ${name}`);

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        const initialMemory = process.memoryUsage();
        let peakMemory = initialMemory.heapUsed;

        // Warmup
        for (let i = 0; i < warmup; i++) {
            await fn();
        }

        const samples: number[] = [];
        let totalIterations = 0;
        const startTime = performance.now();

        // Collect samples
        while (
            samples.length < minSamples ||
            (samples.length < maxSamples && this.calculateCV(samples) > threshold)
        ) {
            const iterStart = performance.now();

            for (let i = 0; i < iterations; i++) {
                await fn();
                totalIterations++;

                const currentMemory = process.memoryUsage();
                peakMemory = Math.max(peakMemory, currentMemory.heapUsed);
            }

            const iterEnd = performance.now();
            const sampleDuration = iterEnd - iterStart;

            samples.push(sampleDuration);

            if (performance.now() - startTime > timeout) {
                break;
            }
        }

        const endTime = performance.now();
        const finalMemory = process.memoryUsage();

        const totalTime = endTime - startTime;
        const avgDuration = samples.reduce((a, b) => a + b, 0) / samples.length;

        return {
            name,
            duration: totalTime,
            memory: {
                initial: initialMemory.heapUsed,
                final: finalMemory.heapUsed,
                peak: peakMemory,
                delta: finalMemory.heapUsed - initialMemory.heapUsed
            },
            cpu: {
                user: process.cpuUsage().user,
                system: process.cpuUsage().system
            },
            iterations: totalIterations,
            opsPerSecond: (totalIterations / totalTime) * 1000,
            samples,
            timestamp: Date.now()
        };
    }

    /**
     * Calculate coefficient of variation
     */
    private calculateCV(samples: number[]): number {
        if (samples.length < 2) return 1;

        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
        const stdDev = Math.sqrt(variance);

        return stdDev / mean;
    }

    /**
     * Print benchmark metrics
     */
    private printMetrics(metrics: BenchmarkMetrics): void {
        const { name, duration, memory, iterations, opsPerSecond } = metrics;

        console.log(`  ✅ ${name}`);
        console.log(`     Time: ${duration.toFixed(2)}ms`);
        console.log(`     Ops/sec: ${opsPerSecond.toFixed(0)}`);
        console.log(`     Memory: ${(memory.delta / 1024 / 1024).toFixed(2)}MB`);
        console.log(`     Iterations: ${iterations}`);
        console.log();
    }

    /**
     * Save results to JSON
     */
    private saveResults(): void {
        const resultsPath = join(this.outputDir, 'results.json');
        writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
        console.log(`Results saved to: ${resultsPath}`);
    }

    /**
     * Generate HTML report
     */
    private generateReport(): void {
        const html = this.generateHTMLReport();
        const reportPath = join(this.outputDir, 'report.html');
        writeFileSync(reportPath, html);
        console.log(`Report generated: ${reportPath}`);
    }

    /**
     * Generate HTML report
     */
    private generateHTMLReport(): string {
        const timestamp = new Date().toISOString();

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benchmark Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 40px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .timestamp {
            color: #666;
            margin-bottom: 40px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #333;
        }
        .summary-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #007acc;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .chart-container {
            margin-bottom: 40px;
            height: 400px;
        }
        .better { color: #28a745; }
        .worse { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Performance Benchmark Report</h1>
        <div class="timestamp">Generated on ${timestamp}</div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Benchmarks</h3>
                <div class="value">${this.results.length}</div>
            </div>
            <div class="summary-card">
                <h3>Total Operations</h3>
                <div class="value">${this.results.reduce((sum, r) => sum + r.iterations, 0).toLocaleString()}</div>
            </div>
            <div class="summary-card">
                <h3>Avg Ops/sec</h3>
                <div class="value">${(this.results.reduce((sum, r) => sum + r.opsPerSecond, 0) / this.results.length).toFixed(0)}</div>
            </div>
            <div class="summary-card">
                <h3>Total Time</h3>
                <div class="value">${(this.results.reduce((sum, r) => sum + r.duration, 0) / 1000).toFixed(2)}s</div>
            </div>
        </div>

        <div class="chart-container">
            <canvas id="opsChart"></canvas>
        </div>

        <div class="chart-container">
            <canvas id="memoryChart"></canvas>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Benchmark</th>
                    <th>Duration (ms)</th>
                    <th>Operations</th>
                    <th>Ops/sec</th>
                    <th>Memory (MB)</th>
                    <th>Samples</th>
                </tr>
            </thead>
            <tbody>
                ${this.results.map(r => `
                    <tr>
                        <td>${r.name}</td>
                        <td>${r.duration.toFixed(2)}</td>
                        <td>${r.iterations.toLocaleString()}</td>
                        <td class="${r.opsPerSecond > 1000 ? 'better' : 'worse'}">${r.opsPerSecond.toFixed(0)}</td>
                        <td>${(r.memory.delta / 1024 / 1024).toFixed(2)}</td>
                        <td>${r.samples.length}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <script>
        // Ops/sec chart
        new Chart(document.getElementById('opsChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(this.results.map(r => r.name))},
                datasets: [{
                    label: 'Operations per Second',
                    data: ${JSON.stringify(this.results.map(r => r.opsPerSecond))},
                    backgroundColor: '#007acc'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Ops/sec'
                        }
                    }
                }
            }
        });

        // Memory chart
        new Chart(document.getElementById('memoryChart'), {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(this.results.map(r => r.name))},
                datasets: [{
                    label: 'Memory Delta (MB)',
                    data: ${JSON.stringify(this.results.map(r => r.memory.delta / 1024 / 1024))},
                    backgroundColor: '#28a745'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Memory (MB)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
    }
}

/**
 * TUI Performance Benchmark
 */
export class TUIBenchmark {
    private terminal: PseudoTerminal;

    constructor() {
        this.terminal = new PseudoTerminal();
    }

    /**
     * Benchmark TUI startup time
     */
    async benchmarkStartup(command: string, args: string[] = []): Promise<number> {
        const startTime = performance.now();

        await this.terminal.spawn(command, args);
        await this.terminal.waitFor(/Welcome|>|\$/, 10000);

        const endTime = performance.now();
        return endTime - startTime;
    }

    /**
     * Benchmark TUI rendering performance
     */
    async benchmarkRendering(command: string, operations: string[]): Promise<{
        totalDuration: number;
        avgOperationDuration: number;
        opsPerSecond: number;
    }> {
        await this.terminal.spawn(command, operations);
        await this.terminal.waitFor(/>|\$/, 10000);

        const startTime = performance.now();

        for (const op of operations) {
            const opStart = performance.now();
            this.terminal.writeln(op);
            await this.terminal.waitFor(/\$|>/, 5000);
            const opEnd = performance.now();
        }

        const endTime = performance.now();
        const totalDuration = endTime - startTime;
        const avgOperationDuration = totalDuration / operations.length;
        const opsPerSecond = (operations.length / totalDuration) * 1000;

        return {
            totalDuration,
            avgOperationDuration,
            opsPerSecond
        };
    }

    /**
     * Benchmark memory usage over time
     */
    async benchmarkMemoryUsage(command: string, duration: number): Promise<Array<{
        time: number;
        heapUsed: number;
        heapTotal: number;
    }>> {
        await this.terminal.spawn(command);
        await this.terminal.waitFor(/>|\$/, 10000);

        const measurements: Array<{
            time: number;
            heapUsed: number;
            heapTotal: number;
        }> = [];

        const startTime = performance.now();
        const endTime = startTime + duration;

        const interval = setInterval(() => {
            const memUsage = process.memoryUsage();
            measurements.push({
                time: performance.now() - startTime,
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal
            });

            if (performance.now() >= endTime) {
                clearInterval(interval);
            }
        }, 100);

        return new Promise((resolve) => {
            setTimeout(() => {
                clearInterval(interval);
                resolve(measurements);
            }, duration);
        });
    }

    /**
     * Clean up
     */
    dispose(): void {
        this.terminal.dispose();
    }
}

/**
 * Helper to create a benchmark suite
 */
export function createBenchmarkSuite(outputDir?: string): BenchmarkSuite {
    return new BenchmarkSuite(outputDir);
}

/**
 * Helper to create a TUI benchmark
 */
export function createTUIBenchmark(): TUIBenchmark {
    return new TUIBenchmark();
}