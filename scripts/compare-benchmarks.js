#!/usr/bin/env node

/**
 * Compare benchmark results between two runs
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

function loadResults(filePath) {
    if (!existsSync(filePath)) {
        console.warn(`Warning: Benchmark results file not found: ${filePath}`);
        return { benchmarks: [] };
    }
    return JSON.parse(readFileSync(filePath, 'utf8'));
}

function compareResults(main, pr) {
    const mainBenchmarks = {};
    const prBenchmarks = {};

    // Index benchmarks by name
    main.benchmarks.forEach(b => {
        mainBenchmarks[b.name] = b;
    });

    pr.benchmarks.forEach(b => {
        prBenchmarks[b.name] = b;
    });

    const allNames = new Set([...Object.keys(mainBenchmarks), ...Object.keys(prBenchmarks)]);
    const comparison = [];

    for (const name of allNames) {
        const mainBench = mainBenchmarks[name];
        const prBench = prBenchmarks[name];

        if (!mainBench) {
            comparison.push({
                name,
                status: 'new',
                opsPerSecond: prBench.opsPerSecond,
                duration: prBench.duration
            });
            continue;
        }

        if (!prBench) {
            comparison.push({
                name,
                status: 'removed',
                opsPerSecond: mainBench.opsPerSecond,
                duration: mainBench.duration
            });
            continue;
        }

        const improvement = ((prBench.opsPerSecond - mainBench.opsPerSecond) / mainBench.opsPerSecond) * 100;
        const durationChange = ((prBench.duration - mainBench.duration) / mainBench.duration) * 100;

        comparison.push({
            name,
            status: improvement > 5 ? 'improved' : improvement < -5 ? 'regressed' : 'stable',
            improvement,
            durationChange,
            opsPerSecond: {
                main: mainBench.opsPerSecond,
                pr: prBench.opsPerSecond
            },
            duration: {
                main: mainBench.duration,
                pr: prBench.duration
            }
        });
    }

    return comparison.sort((a, b) => {
        // Sort by regressions first, then improvements, then alphabetically
        if (a.status === 'regressed' && b.status !== 'regressed') return -1;
        if (a.status !== 'regressed' && b.status === 'regressed') return 1;
        if (a.status === 'improved' && b.status !== 'improved') return -1;
        if (a.status !== 'improved' && b.status === 'improved') return 1;
        return a.name.localeCompare(b.name);
    });
}

function generateMarkdownReport(comparison) {
    let report = '| Benchmark | Status | Ops/sec (Δ) | Duration (Δ) |\n';
    report += '|-----------|--------|-------------|--------------|\n';

    for (const bench of comparison) {
        let statusEmoji = '';
        let statusText = '';
        let opsText = '';
        let durationText = '';

        switch (bench.status) {
            case 'improved':
                statusEmoji = '✅';
                statusText = 'Improved';
                opsText = `${bench.opsPerSecond.pr.toFixed(0)} (${bench.improvement > 0 ? '+' : ''}${bench.improvement.toFixed(1)}%)`;
                durationText = `${bench.duration.pr.toFixed(0)}ms (${bench.durationChange > 0 ? '+' : ''}${bench.durationChange.toFixed(1)}%)`;
                break;
            case 'regressed':
                statusEmoji = '❌';
                statusText = 'Regressed';
                opsText = `${bench.opsPerSecond.pr.toFixed(0)} (${bench.improvement > 0 ? '+' : ''}${bench.improvement.toFixed(1)}%)`;
                durationText = `${bench.duration.pr.toFixed(0)}ms (${bench.durationChange > 0 ? '+' : ''}${bench.durationChange.toFixed(1)}%)`;
                break;
            case 'new':
                statusEmoji = '➕';
                statusText = 'New';
                opsText = `${bench.opsPerSecond.toFixed(0)}`;
                durationText = `${bench.duration.toFixed(0)}ms`;
                break;
            case 'removed':
                statusEmoji = '➖';
                statusText = 'Removed';
                opsText = `${bench.opsPerSecond.toFixed(0)}`;
                durationText = `${bench.duration.toFixed(0)}ms`;
                break;
            default:
                statusEmoji = '⚪';
                statusText = 'Stable';
                opsText = `${bench.opsPerSecond.pr.toFixed(0)} (${bench.improvement > 0 ? '+' : ''}${bench.improvement.toFixed(1)}%)`;
                durationText = `${bench.duration.pr.toFixed(0)}ms (${bench.durationChange > 0 ? '+' : ''}${bench.durationChange.toFixed(1)}%)`;
        }

        report += `| ${bench.name} | ${statusEmoji} ${statusText} | ${opsText} | ${durationText} |\n`;
    }

    // Add summary
    const improved = comparison.filter(b => b.status === 'improved').length;
    const regressed = comparison.filter(b => b.status === 'regressed').length;
    const stable = comparison.filter(b => b.status === 'stable').length;
    const total = comparison.length;

    report += `\n### Summary\n\n`;
    report += `- **Total Benchmarks**: ${total}\n`;
    report += `- **✅ Improved**: ${improved}\n`;
    report += `- **❌ Regressed**: ${regressed}\n`;
    report += `- **⚪ Stable**: ${stable}\n`;
    report += `- **➕ New**: ${comparison.filter(b => b.status === 'new').length}\n`;
    report += `- **➖ Removed**: ${comparison.filter(b => b.status === 'removed').length}\n`;

    if (regressed > 0) {
        report += `\n⚠️ **Warning**: ${regressed} benchmark(s) have regressed. Please review the performance impact.\n`;
    }

    return report;
}

// Main execution
const mainFile = process.argv[2];
const prFile = process.argv[3];

if (!mainFile || !prFile) {
    console.error('Usage: node compare-benchmarks.js <main-results.json> <pr-results.json>');
    process.exit(1);
}

const mainResults = loadResults(mainFile);
const prResults = loadResults(prFile);
const comparison = compareResults(mainResults, prResults);

// Generate markdown report
const markdown = generateMarkdownReport(comparison);

// Save comparison
const outputPath = join('tests/benchmark-results', 'comparison.md');
writeFileSync(outputPath, markdown);

// Also save detailed JSON
writeFileSync(
    join('tests/benchmark-results', 'comparison.json'),
    JSON.stringify({ comparison, main: mainResults, pr: prResults }, null, 2)
);

// Print to console
console.log('\n📊 Benchmark Comparison Results');
console.log('================================');
console.log(markdown);

// Exit with error code if there are regressions
const hasRegressions = comparison.some(b => b.status === 'regressed');
if (hasRegressions) {
    console.log('\n❌ Performance regressions detected!');
    process.exit(1);
} else {
    console.log('\n✅ No performance regressions detected!');
    process.exit(0);
}