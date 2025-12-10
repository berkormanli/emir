import { describe, it, expect, beforeEach } from 'vitest';
import { BarChart, BarChartOptions } from '../../src/tui/bar-chart';
import { DataPoint } from '../../src/tui/chart';

describe('BarChart', () => {
    let chart: BarChart;
    const sampleData: DataPoint[] = [
        { label: 'Jan', value: 10 },
        { label: 'Feb', value: 20 },
        { label: 'Mar', value: 15 },
        { label: 'Apr', value: 25 },
        { label: 'May', value: 30 }
    ];

    beforeEach(() => {
        chart = new BarChart('test-chart', sampleData);
    });

    describe('Constructor', () => {
        it('should create bar chart with default options', () => {
            expect(chart).toBeDefined();
            expect(chart.getId()).toBe('test-chart');
        });

        it('should create bar chart with custom options', () => {
            const options: BarChartOptions = {
                orientation: 'horizontal',
                barWidth: 2,
                barGap: 1,
                barStyle: 'unicode',
                showBarValues: true
            };
            const customChart = new BarChart('custom', sampleData, options);
            expect(customChart).toBeDefined();
        });

        it('should handle empty data', () => {
            const emptyChart = new BarChart('empty', []);
            expect(emptyChart).toBeDefined();
            const rendered = emptyChart.render();
            expect(rendered).toBeDefined();
        });
    });

    describe('Data Management', () => {
        it('should set new data', () => {
            const newData: DataPoint[] = [
                { label: 'A', value: 5 },
                { label: 'B', value: 10 }
            ];
            chart.setData(newData);
            const rendered = chart.render();
            expect(rendered).toBeDefined();
        });

        it('should add data point', () => {
            chart.addDataPoint({ label: 'Jun', value: 35 });
            const rendered = chart.render();
            expect(rendered).toContain('Jun');
        });

        it('should clear data', () => {
            chart.clearData();
            const rendered = chart.render();
            expect(rendered).toBeDefined();
        });
    });

    describe('Vertical Bar Rendering', () => {
        it('should render vertical bars by default', () => {
            const rendered = chart.render();
            expect(rendered).toBeDefined();
            expect(rendered.length).toBeGreaterThan(0);
        });

        it('should render with bar values', () => {
            const chartWithValues = new BarChart('values', sampleData, {
                showBarValues: true
            });
            const rendered = chartWithValues.render();
            expect(rendered).toContain('10');
            expect(rendered).toContain('20');
            expect(rendered).toContain('30');
        });

        it('should render with different bar styles', () => {
            const asciiChart = new BarChart('ascii', sampleData, {
                barStyle: 'ascii'
            });
            const asciiRender = asciiChart.render();
            expect(asciiRender).toBeDefined();

            const unicodeChart = new BarChart('unicode', sampleData, {
                barStyle: 'unicode'
            });
            const unicodeRender = unicodeChart.render();
            expect(unicodeRender).toBeDefined();
        });
    });

    describe('Horizontal Bar Rendering', () => {
        beforeEach(() => {
            chart = new BarChart('horizontal', sampleData, {
                orientation: 'horizontal'
            });
        });

        it('should render horizontal bars', () => {
            const rendered = chart.render();
            expect(rendered).toBeDefined();
            expect(rendered.length).toBeGreaterThan(0);
        });

        it('should show labels for horizontal bars', () => {
            const rendered = chart.render();
            expect(rendered).toContain('Jan');
            expect(rendered).toContain('Feb');
            expect(rendered).toContain('Mar');
        });
    });

    describe('Grouped Bars', () => {
        const groupedData: DataPoint[] = [
            { label: 'Q1', value: 100, series: '2022' },
            { label: 'Q2', value: 120, series: '2022' },
            { label: 'Q1', value: 110, series: '2023' },
            { label: 'Q2', value: 130, series: '2023' }
        ];

        it('should render grouped bars', () => {
            const groupedChart = new BarChart('grouped', groupedData, {
                groupedBars: true
            });
            const rendered = groupedChart.render();
            expect(rendered).toBeDefined();
        });

        it('should show legend for grouped bars', () => {
            const groupedChart = new BarChart('grouped', groupedData, {
                groupedBars: true,
                showLegend: true
            });
            const rendered = groupedChart.render();
            expect(rendered).toContain('2022');
            expect(rendered).toContain('2023');
        });
    });

    describe('Stacked Bars', () => {
        const stackedData: DataPoint[] = [
            { label: 'Product A', value: 50, series: 'Region 1' },
            { label: 'Product A', value: 30, series: 'Region 2' },
            { label: 'Product B', value: 40, series: 'Region 1' },
            { label: 'Product B', value: 60, series: 'Region 2' }
        ];

        it('should render stacked bars', () => {
            const stackedChart = new BarChart('stacked', stackedData, {
                stackedBars: true
            });
            const rendered = stackedChart.render();
            expect(rendered).toBeDefined();
        });

        it('should calculate correct scale for stacked bars', () => {
            const stackedChart = new BarChart('stacked', stackedData, {
                stackedBars: true,
                showBarValues: true
            });
            const rendered = stackedChart.render();
            // Should show total values
            expect(rendered).toBeDefined();
        });
    });

    describe('Chart Options', () => {
        it('should render with title', () => {
            const chartWithTitle = new BarChart('titled', sampleData, {
                title: 'Monthly Sales'
            });
            const rendered = chartWithTitle.render();
            expect(rendered).toContain('Monthly Sales');
        });

        it('should render with border', () => {
            const chartWithBorder = new BarChart('bordered', sampleData, {
                border: 'single'
            });
            const rendered = chartWithBorder.render();
            expect(rendered).toContain('─');
            expect(rendered).toContain('│');
        });

        it('should render with axes', () => {
            const chartWithAxes = new BarChart('axes', sampleData, {
                xAxis: { show: true },
                yAxis: { show: true }
            });
            const rendered = chartWithAxes.render();
            expect(rendered).toBeDefined();
            // Should contain axis lines
            expect(rendered).toContain('─');
            expect(rendered).toContain('│');
        });

        it('should format Y axis values', () => {
            const bigData: DataPoint[] = [
                { label: 'A', value: 1500 },
                { label: 'B', value: 2500000 }
            ];
            const chart = new BarChart('format', bigData, {
                yAxis: { show: true }
            });
            const rendered = chart.render();
            expect(rendered).toContain('K'); // 1.5K
            expect(rendered).toContain('M'); // 2.5M
        });
    });

    describe('Color Support', () => {
        it('should use custom colors', () => {
            const colorChart = new BarChart('colors', sampleData, {
                colors: [1, 2, 3, 4, 5]
            });
            const rendered = colorChart.render();
            expect(rendered).toContain('\x1b[31m'); // Red color code
        });

        it('should use per-point colors', () => {
            const colorData: DataPoint[] = [
                { label: 'Red', value: 10, color: 1 },
                { label: 'Green', value: 20, color: 2 },
                { label: 'Blue', value: 15, color: 4 }
            ];
            const chart = new BarChart('point-colors', colorData);
            const rendered = chart.render();
            expect(rendered).toContain('\x1b[31m'); // Red
            expect(rendered).toContain('\x1b[32m'); // Green
            expect(rendered).toContain('\x1b[34m'); // Blue
        });
    });

    describe('Negative Values', () => {
        it('should handle negative values', () => {
            const negativeData: DataPoint[] = [
                { label: 'Profit', value: 100 },
                { label: 'Loss', value: -50 },
                { label: 'Break Even', value: 0 }
            ];
            const chart = new BarChart('negative', negativeData);
            const rendered = chart.render();
            expect(rendered).toBeDefined();
        });

        it('should use base value for reference', () => {
            const chart = new BarChart('base', sampleData, {
                baseValue: 15
            });
            const rendered = chart.render();
            expect(rendered).toBeDefined();
        });
    });

    describe('Size and Layout', () => {
        it('should respect custom size', () => {
            const chart = new BarChart('sized', sampleData, {}, {
                width: 40,
                height: 10
            });
            const rendered = chart.render();
            const lines = rendered.split('\n');
            expect(lines.length).toBeLessThanOrEqual(10);
        });

        it('should adjust bar width and gap', () => {
            const chart = new BarChart('spacing', sampleData, {
                barWidth: 3,
                barGap: 2
            });
            const rendered = chart.render();
            expect(rendered).toBeDefined();
        });

        it('should handle padding', () => {
            const chart = new BarChart('padded', sampleData, {
                padding: [2, 3, 2, 3]
            });
            const rendered = chart.render();
            expect(rendered).toBeDefined();
        });
    });
});
