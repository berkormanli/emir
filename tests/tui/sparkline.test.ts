import { describe, it, expect, beforeEach } from 'vitest';
import { Sparkline, SparklineOptions } from '../../src/tui/sparkline';

describe('Sparkline', () => {
    let sparkline: Sparkline;
    const sampleData = [1, 3, 2, 5, 4, 7, 6, 8, 5, 3];

    beforeEach(() => {
        sparkline = new Sparkline('test-spark', sampleData);
    });

    describe('Constructor', () => {
        it('should create sparkline with default options', () => {
            expect(sparkline).toBeDefined();
            expect(sparkline.getId()).toBe('test-spark');
        });

        it('should create sparkline with custom options', () => {
            const options: SparklineOptions = {
                style: 'bar',
                color: 3,
                showMin: true,
                showMax: true,
                prefix: 'CPU: ',
                suffix: '%'
            };
            const custom = new Sparkline('custom', sampleData, options, 30);
            expect(custom).toBeDefined();
            const rendered = custom.render();
            expect(rendered).toContain('CPU:');
            expect(rendered).toContain('%');
        });

        it('should handle empty data', () => {
            const empty = new Sparkline('empty', []);
            const rendered = empty.render();
            expect(rendered).toBeDefined();
        });
    });

    describe('Data Management', () => {
        it('should set new data', () => {
            sparkline.setData([10, 20, 30, 40]);
            const rendered = sparkline.render();
            expect(rendered).toBeDefined();
        });

        it('should add data point', () => {
            sparkline.addDataPoint(10);
            expect(sparkline.getCurrentValue()).toBe(10);
        });

        it('should limit data points when adding', () => {
            const spark = new Sparkline('limited', []);
            for (let i = 0; i < 20; i++) {
                spark.addDataPoint(i, 10); // Max 10 points
            }
            const rendered = spark.render();
            expect(rendered).toBeDefined();
        });
    });

    describe('Rendering Styles', () => {
        it('should render line style by default', () => {
            const rendered = sparkline.render();
            expect(rendered).toBeDefined();
            // Should contain block characters
            expect(rendered).toMatch(/[▁▂▃▄▅▆▇█]/);
        });

        it('should render bar style', () => {
            const bar = new Sparkline('bar', sampleData, { style: 'bar' });
            const rendered = bar.render();
            expect(rendered).toBeDefined();
            expect(rendered).toMatch(/[▏▎▍▌▋▊▉█]/);
        });

        it('should render dots style', () => {
            const dots = new Sparkline('dots', sampleData, { style: 'dots' });
            const rendered = dots.render();
            expect(rendered).toBeDefined();
            // Should contain braille characters
            expect(rendered).toMatch(/[⠀-⣿]/);
        });

        it('should render area style', () => {
            const area = new Sparkline('area', sampleData, { style: 'area' });
            const rendered = area.render();
            expect(rendered).toBeDefined();
            expect(rendered).toMatch(/[▁▂▃▄▅▆▇█]/);
        });
    });

    describe('Labels and Values', () => {
        it('should show first value', () => {
            const spark = new Sparkline('first', sampleData, {
                showFirst: true
            });
            const rendered = spark.render();
            expect(rendered).toContain('1'); // First value
        });

        it('should show last value', () => {
            const spark = new Sparkline('last', sampleData, {
                showLast: true
            });
            const rendered = spark.render();
            expect(rendered).toContain('3'); // Last value
        });

        it('should show min and max values', () => {
            const spark = new Sparkline('minmax', sampleData, {
                showMin: true,
                showMax: true,
                minLabel: 'Min: ',
                maxLabel: 'Max: '
            });
            const rendered = spark.render();
            expect(rendered).toContain('Min:');
            expect(rendered).toContain('Max:');
        });

        it('should use custom value formatter', () => {
            const spark = new Sparkline('format', [1.234, 2.345, 3.456], {
                showLast: true,
                formatValue: (v) => v.toFixed(2)
            });
            const rendered = spark.render();
            expect(rendered).toContain('3.46');
        });
    });

    describe('Statistics', () => {
        it('should calculate min value', () => {
            expect(sparkline.getMin()).toBe(1);
        });

        it('should calculate max value', () => {
            expect(sparkline.getMax()).toBe(8);
        });

        it('should calculate average', () => {
            const avg = sparkline.getAverage();
            expect(avg).toBeCloseTo(4.4, 1);
        });

        it('should get current value', () => {
            expect(sparkline.getCurrentValue()).toBe(3);
        });

        it('should determine trend', () => {
            const upTrend = new Sparkline('up', [1, 2, 3, 4, 5]);
            expect(upTrend.getTrend()).toBe('up');

            const downTrend = new Sparkline('down', [5, 4, 3, 2, 1]);
            expect(downTrend.getTrend()).toBe('down');

            const neutral = new Sparkline('neutral', [3, 3, 3, 3, 3]);
            expect(neutral.getTrend()).toBe('neutral');
        });
    });

    describe('Data Resampling', () => {
        it('should resample data to fit width', () => {
            const longData = Array.from({ length: 100 }, (_, i) => i);
            const spark = new Sparkline('resample', longData, {}, 20);
            const rendered = spark.render();
            expect(rendered).toBeDefined();
            // Should be approximately 20 characters wide
            expect(rendered.length).toBeLessThanOrEqual(30); // With some buffer
        });

        it('should interpolate sparse data', () => {
            const sparseData = [1, 5, 2];
            const spark = new Sparkline('sparse', sparseData, {}, 10);
            const rendered = spark.render();
            expect(rendered).toBeDefined();
        });
    });

    describe('Color Support', () => {
        it('should apply color to sparkline', () => {
            const colored = new Sparkline('colored', sampleData, {
                color: 2 // Green
            });
            const rendered = colored.render();
            expect(rendered).toContain('\x1b[32m'); // Green color code
        });
    });

    describe('Prefix and Suffix', () => {
        it('should add prefix and suffix', () => {
            const spark = new Sparkline('labeled', sampleData, {
                prefix: 'Load: ',
                suffix: ' avg'
            });
            const rendered = spark.render();
            expect(rendered).toContain('Load:');
            expect(rendered).toContain('avg');
        });

        it('should adjust width for prefix and suffix', () => {
            const spark = new Sparkline('adjusted', sampleData, {
                prefix: 'LONG_PREFIX: ',
                suffix: ' LONG_SUFFIX'
            }, 30);
            const rendered = spark.render();
            expect(rendered).toBeDefined();
            expect(rendered.length).toBeLessThanOrEqual(40);
        });
    });

    describe('Edge Cases', () => {
        it('should handle single value', () => {
            const single = new Sparkline('single', [5]);
            const rendered = single.render();
            expect(rendered).toBeDefined();
        });

        it('should handle all same values', () => {
            const same = new Sparkline('same', [5, 5, 5, 5, 5]);
            const rendered = same.render();
            expect(rendered).toBeDefined();
        });

        it('should handle negative values', () => {
            const negative = new Sparkline('negative', [-5, -2, 0, 2, 5]);
            const rendered = negative.render();
            expect(rendered).toBeDefined();
        });

        it('should handle very large values', () => {
            const large = new Sparkline('large', [1000000, 2000000, 1500000]);
            const rendered = large.render();
            expect(rendered).toBeDefined();
        });
    });
});
