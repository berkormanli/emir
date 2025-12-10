#!/usr/bin/env bun

/**
 * End-to-end test runner with CI/CD integration
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';

interface TestResults {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    suites: TestSuite[];
}

interface TestSuite {
    name: string;
    tests: Test[];
    duration: number;
}

interface Test {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
}

class E2ETestRunner {
    private results: TestResults = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        suites: []
    };

    private outputDir = './test-results';

    constructor() {
        if (!existsSync(this.outputDir)) {
            mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async run(): Promise<void> {
        console.log('🚀 Starting E2E Tests\n');

        const startTime = performance.now();

        // Run build first
        await this.buildProject();

        // Run CLI E2E tests
        await this.runTestSuite('CLI E2E Tests', 'tests/e2e/cli.e2e.test.ts');

        // Run TUI E2E tests
        await this.runTestSuite('TUI E2E Tests', 'tests/e2e/tui.e2e.test.ts');

        // Run performance benchmarks
        await this.runBenchmarks();

        const endTime = performance.now();
        this.results.duration = endTime - startTime;

        // Generate reports
        await this.generateReports();

        // Print summary
        this.printSummary();

        // Exit with appropriate code
        process.exit(this.results.failed > 0 ? 1 : 0);
    }

    private async buildProject(): Promise<void> {
        console.log('📦 Building project...');

        return new Promise((resolve, reject) => {
            const build = spawn('bun', ['run', 'build'], {
                stdio: 'inherit'
            });

            build.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Build successful\n');
                    resolve();
                } else {
                    console.error('❌ Build failed');
                    reject(new Error('Build failed'));
                }
            });
        });
    }

    private async runTestSuite(suiteName: string, testFile: string): Promise<void> {
        console.log(`🧪 Running ${suiteName}...`);

        const suite: TestSuite = {
            name: suiteName,
            tests: [],
            duration: 0
        };

        const startTime = performance.now();

        try {
            // Run tests with vitest
            const output = await this.executeCommand(
                'bun',
                ['test', testFile, '--reporter=verbose', '--run'],
                { capture: true }
            );

            // Parse output (simplified parsing)
            const lines = output.split('\n');
            let currentTest: Test | null = null;

            for (const line of lines) {
                const testMatch = line.match(/✓|×|\s+(.+?)\s+\[\d+ms\]/);
                if (testMatch) {
                    const testName = testMatch[1];
                    const passed = line.includes('✓');

                    if (currentTest) {
                        suite.tests.push(currentTest);
                    }

                    currentTest = {
                        name: testName,
                        status: passed ? 'passed' : 'failed',
                        duration: 0 // Would need more detailed parsing
                    };

                    this.results.total++;
                    if (passed) {
                        this.results.passed++;
                    } else {
                        this.results.failed++;
                    }
                }
            }

            if (currentTest) {
                suite.tests.push(currentTest);
            }

        } catch (error) {
            console.error(`❌ ${suiteName} failed:`, error);
            this.results.failed++;
        }

        const endTime = performance.now();
        suite.duration = endTime - startTime;
        this.results.suites.push(suite);

        console.log(`✅ ${suiteName} completed (${suite.duration.toFixed(2)}ms)\n`);
    }

    private async runBenchmarks(): Promise<void> {
        console.log('📊 Running performance benchmarks...');

        const startTime = performance.now();

        try {
            // Run benchmark script
            await this.executeCommand(
                'bun',
                ['tests/benchmarks/performance.test.ts'],
                { capture: false }
            );

            console.log('✅ Benchmarks completed');
        } catch (error) {
            console.error('❌ Benchmarks failed:', error);
        }

        const endTime = performance.now();
        console.log(`⏱️ Benchmarks duration: ${(endTime - startTime).toFixed(2)}ms\n`);
    }

    private async executeCommand(
        command: string,
        args: string[],
        options: { capture?: boolean } = {}
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                stdio: options.capture ? 'pipe' : 'inherit',
                env: {
                    ...process.env,
                    CI: 'true',
                    NODE_ENV: 'test'
                }
            });

            let output = '';

            if (options.capture && child.stdout) {
                child.stdout.on('data', (data) => {
                    output += data.toString();
                });
            }

            child.on('close', (code) => {
                if (code === 0) {
                    resolve(output);
                } else {
                    reject(new Error(`Command failed with code ${code}`));
                }
            });

            child.on('error', reject);
        });
    }

    private async generateReports(): Promise<void> {
        // JSON report
        const jsonReport = {
            timestamp: new Date().toISOString(),
            results: this.results,
            environment: {
                node: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };

        writeFileSync(
            join(this.outputDir, 'e2e-results.json'),
            JSON.stringify(jsonReport, null, 2)
        );

        // JUnit XML report
        const junitXml = this.generateJUnitXML();
        writeFileSync(
            join(this.outputDir, 'junit.xml'),
            junitXml
        );

        // HTML report
        const htmlReport = this.generateHTMLReport();
        writeFileSync(
            join(this.outputDir, 'report.html'),
            htmlReport
        );

        console.log('📋 Reports generated in ./test-results');
    }

    private generateJUnitXML(): string {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += `<testsuites name="E2E Tests" tests="${this.results.total}" failures="${this.results.failed}" time="${(this.results.duration / 1000).toFixed(2)}">\n`;

        for (const suite of this.results.suites) {
            xml += `  <testsuite name="${suite.name}" tests="${suite.tests.length}" failures="${suite.tests.filter(t => t.status === 'failed').length}" time="${(suite.duration / 1000).toFixed(2)}">\n`;

            for (const test of suite.tests) {
                xml += `    <testcase name="${test.name}" classname="${suite.name}" time="${(test.duration / 1000).toFixed(2)}">\n`;
                if (test.status === 'failed' && test.error) {
                    xml += `      <failure message="${test.error}"></failure>\n`;
                }
                xml += '    </testcase>\n';
            }

            xml += '  </testsuite>\n';
        }

        xml += '</testsuites>';
        return xml;
    }

    private generateHTMLReport(): string {
        const passRate = this.results.total > 0 ? (this.results.passed / this.results.total * 100).toFixed(1) : '0';

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E2E Test Report</title>
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
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            color: #666;
        }
        .summary-card .value {
            font-size: 32px;
            font-weight: bold;
        }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .test-suite {
            margin: 30px 0;
            border: 1px solid #ddd;
            border-radius: 6px;
            overflow: hidden;
        }
        .suite-header {
            background: #f8f9fa;
            padding: 15px 20px;
            font-weight: 600;
            border-bottom: 1px solid #ddd;
        }
        .test-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .test-item {
            padding: 12px 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .test-item:last-child {
            border-bottom: none;
        }
        .test-name {
            flex: 1;
        }
        .test-status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .status-passed {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        .status-skipped {
            background: #fff3cd;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>E2E Test Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Tests</h3>
                <div class="value">${this.results.total}</div>
            </div>
            <div class="summary-card">
                <h3>Passed</h3>
                <div class="value passed">${this.results.passed}</div>
            </div>
            <div class="summary-card">
                <h3>Failed</h3>
                <div class="value failed">${this.results.failed}</div>
            </div>
            <div class="summary-card">
                <h3>Pass Rate</h3>
                <div class="value">${passRate}%</div>
            </div>
            <div class="summary-card">
                <h3>Duration</h3>
                <div class="value">${(this.results.duration / 1000).toFixed(2)}s</div>
            </div>
        </div>

        ${this.results.suites.map(suite => `
            <div class="test-suite">
                <div class="suite-header">
                    ${suite.name} (${suite.duration.toFixed(2)}ms)
                </div>
                <ul class="test-list">
                    ${suite.tests.map(test => `
                        <li class="test-item">
                            <span class="test-name">${test.name}</span>
                            <span class="test-status status-${test.status}">${test.status}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
    }

    private printSummary(): void {
        console.log('\n📊 Test Summary');
        console.log('================');
        console.log(`Total: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏭️ Skipped: ${this.results.skipped}`);
        console.log(`⏱️ Duration: ${(this.results.duration / 1000).toFixed(2)}s`);
        console.log('');

        if (this.results.failed > 0) {
            console.log('❌ Some tests failed. Check the reports for details.');
            process.exit(1);
        } else {
            console.log('🎉 All tests passed!');
        }
    }
}

// Run the tests
if (import.meta.main) {
    const runner = new E2ETestRunner();
    runner.run().catch(console.error);
}