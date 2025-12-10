import { BaseComponent } from './base-component';
import { Size } from './types';
import { AnsiUtils } from './ansi-utils';

/**
 * Sparkline style
 */
export type SparklineStyle = 'line' | 'bar' | 'dots' | 'area';

/**
 * Sparkline options
 */
export interface SparklineOptions {
    style?: SparklineStyle;
    color?: number;
    showMin?: boolean;
    showMax?: boolean;
    showFirst?: boolean;
    showLast?: boolean;
    showBaseline?: boolean;
    baseline?: number;
    prefix?: string;
    suffix?: string;
    minLabel?: string;
    maxLabel?: string;
    formatValue?: (value: number) => string;
}

/**
 * Sparkline component - compact inline chart
 */
export class Sparkline extends BaseComponent {
    private data: number[];
    private options: Required<SparklineOptions>;
    private min: number;
    private max: number;
    private range: number;

    constructor(
        id: string,
        data: number[] = [],
        options: SparklineOptions = {},
        width: number = 20
    ) {
        super(id);
        this.data = data;
        this.size = { width, height: 1 };
        
        this.options = {
            style: options.style || 'line',
            color: options.color ?? 2,
            showMin: options.showMin ?? false,
            showMax: options.showMax ?? false,
            showFirst: options.showFirst ?? false,
            showLast: options.showLast ?? false,
            showBaseline: options.showBaseline ?? false,
            baseline: options.baseline ?? 0,
            prefix: options.prefix || '',
            suffix: options.suffix || '',
            minLabel: options.minLabel || '',
            maxLabel: options.maxLabel || '',
            formatValue: options.formatValue || ((v: number) => v.toFixed(1))
        };
        
        this.updateStats();
    }

    /**
     * Update statistics
     */
    private updateStats(): void {
        if (this.data.length === 0) {
            this.min = 0;
            this.max = 1;
            this.range = 1;
        } else {
            this.min = Math.min(...this.data);
            this.max = Math.max(...this.data);
            this.range = this.max - this.min || 1;
        }
    }

    /**
     * Set data
     */
    setData(data: number[]): void {
        this.data = data;
        this.updateStats();
        this.markDirty();
    }

    /**
     * Add data point
     */
    addDataPoint(value: number, maxPoints?: number): void {
        this.data.push(value);
        
        // Keep only the last maxPoints if specified
        if (maxPoints && this.data.length > maxPoints) {
            this.data = this.data.slice(-maxPoints);
        }
        
        this.updateStats();
        this.markDirty();
    }

    /**
     * Get Unicode block character for height
     */
    private getBlockChar(height: number): string {
        const blocks = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const index = Math.min(8, Math.max(0, Math.round(height * 8)));
        return blocks[index];
    }

    /**
     * Get vertical bar character for height
     */
    private getVerticalBar(height: number): string {
        const bars = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
        const index = Math.min(8, Math.max(0, Math.round(height * 8)));
        return bars[index];
    }

    /**
     * Get braille character for two heights
     */
    private getBrailleChar(height1: number, height2: number): string {
        // Simplified braille mapping for sparklines
        const braille = [
            ['⠀', '⠁', '⠃', '⠇'],
            ['⠈', '⠉', '⠋', '⠏'],
            ['⠘', '⠙', '⠛', '⠟'],
            ['⠸', '⠹', '⠻', '⠿']
        ];
        
        const y1 = Math.min(3, Math.max(0, Math.floor(height1 * 4)));
        const y2 = Math.min(3, Math.max(0, Math.floor(height2 * 4)));
        
        return braille[3 - y1][3 - y2];
    }

    /**
     * Render line sparkline
     */
    private renderLine(): string {
        if (this.data.length === 0) return this.options.prefix + this.options.suffix;
        
        const result: string[] = [];
        
        // Add prefix
        if (this.options.prefix) {
            result.push(this.options.prefix);
        }
        
        // Calculate available width for sparkline
        let availableWidth = this.size.width - this.options.prefix.length - this.options.suffix.length;
        
        // Reserve space for labels if needed
        if (this.options.showFirst || this.options.showLast) {
            const firstLabel = this.options.showFirst ? this.options.formatValue(this.data[0]) : '';
            const lastLabel = this.options.showLast ? this.options.formatValue(this.data[this.data.length - 1]) : '';
            availableWidth -= firstLabel.length + lastLabel.length + 2; // 2 for spacing
            
            if (this.options.showFirst) {
                result.push(firstLabel + ' ');
            }
        }
        
        // Sample or interpolate data to fit width
        const sparkData = this.resampleData(availableWidth);
        
        // Generate sparkline
        const sparkline = sparkData.map(value => {
            const normalized = (value - this.min) / this.range;
            return this.getBlockChar(normalized);
        }).join('');
        
        // Apply color
        result.push(AnsiUtils.setForegroundColor(this.options.color) + sparkline + AnsiUtils.reset());
        
        // Add last value label if needed
        if (this.options.showLast) {
            const lastLabel = this.options.formatValue(this.data[this.data.length - 1]);
            result.push(' ' + lastLabel);
        }
        
        // Add suffix
        if (this.options.suffix) {
            result.push(this.options.suffix);
        }
        
        // Add min/max indicators
        if (this.options.showMin || this.options.showMax) {
            const minIndex = this.data.indexOf(this.min);
            const maxIndex = this.data.indexOf(this.max);
            
            if (this.options.showMin && this.options.minLabel) {
                result.push(` ${this.options.minLabel}${this.options.formatValue(this.min)}`);
            }
            if (this.options.showMax && this.options.maxLabel) {
                result.push(` ${this.options.maxLabel}${this.options.formatValue(this.max)}`);
            }
        }
        
        return result.join('');
    }

    /**
     * Render bar sparkline
     */
    private renderBar(): string {
        if (this.data.length === 0) return this.options.prefix + this.options.suffix;
        
        const result: string[] = [];
        
        // Add prefix
        if (this.options.prefix) {
            result.push(this.options.prefix);
        }
        
        // Calculate available width
        const availableWidth = this.size.width - this.options.prefix.length - this.options.suffix.length;
        
        // Sample data
        const sparkData = this.resampleData(availableWidth);
        
        // Generate bar sparkline
        const sparkline = sparkData.map(value => {
            const normalized = (value - this.min) / this.range;
            return this.getVerticalBar(normalized);
        }).join('');
        
        // Apply color
        result.push(AnsiUtils.setForegroundColor(this.options.color) + sparkline + AnsiUtils.reset());
        
        // Add suffix
        if (this.options.suffix) {
            result.push(this.options.suffix);
        }
        
        return result.join('');
    }

    /**
     * Render dots sparkline
     */
    private renderDots(): string {
        if (this.data.length === 0) return this.options.prefix + this.options.suffix;
        
        const result: string[] = [];
        
        // Add prefix
        if (this.options.prefix) {
            result.push(this.options.prefix);
        }
        
        // Calculate available width
        const availableWidth = this.size.width - this.options.prefix.length - this.options.suffix.length;
        
        // Sample data (use half width for braille)
        const sparkData = this.resampleData(availableWidth * 2);
        
        // Generate dots sparkline using braille characters
        const sparkline: string[] = [];
        for (let i = 0; i < sparkData.length - 1; i += 2) {
            const h1 = (sparkData[i] - this.min) / this.range;
            const h2 = i + 1 < sparkData.length ? (sparkData[i + 1] - this.min) / this.range : h1;
            sparkline.push(this.getBrailleChar(h1, h2));
        }
        
        // Apply color
        result.push(AnsiUtils.setForegroundColor(this.options.color) + sparkline.join('') + AnsiUtils.reset());
        
        // Add suffix
        if (this.options.suffix) {
            result.push(this.options.suffix);
        }
        
        return result.join('');
    }

    /**
     * Render area sparkline
     */
    private renderArea(): string {
        if (this.data.length === 0) return this.options.prefix + this.options.suffix;
        
        const result: string[] = [];
        
        // Add prefix
        if (this.options.prefix) {
            result.push(this.options.prefix);
        }
        
        // Calculate available width
        const availableWidth = this.size.width - this.options.prefix.length - this.options.suffix.length;
        
        // Sample data
        const sparkData = this.resampleData(availableWidth);
        
        // Generate area sparkline with filled blocks
        const sparkline = sparkData.map(value => {
            const normalized = (value - this.min) / this.range;
            // Use filled blocks for area
            const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
            const index = Math.min(7, Math.max(0, Math.floor(normalized * 8)));
            return blocks[index];
        }).join('');
        
        // Apply color with some transparency effect
        result.push(AnsiUtils.setForegroundColor(this.options.color) + sparkline + AnsiUtils.reset());
        
        // Add suffix
        if (this.options.suffix) {
            result.push(this.options.suffix);
        }
        
        return result.join('');
    }

    /**
     * Resample data to fit width
     */
    private resampleData(targetWidth: number): number[] {
        if (this.data.length === 0) return [];
        if (this.data.length === targetWidth) return [...this.data];
        
        const result: number[] = [];
        
        if (this.data.length < targetWidth) {
            // Interpolate to expand
            const ratio = (this.data.length - 1) / (targetWidth - 1);
            for (let i = 0; i < targetWidth; i++) {
                const pos = i * ratio;
                const index = Math.floor(pos);
                const fraction = pos - index;
                
                if (index >= this.data.length - 1) {
                    result.push(this.data[this.data.length - 1]);
                } else {
                    // Linear interpolation
                    const value = this.data[index] * (1 - fraction) + this.data[index + 1] * fraction;
                    result.push(value);
                }
            }
        } else {
            // Sample to compress
            const ratio = this.data.length / targetWidth;
            for (let i = 0; i < targetWidth; i++) {
                const start = Math.floor(i * ratio);
                const end = Math.floor((i + 1) * ratio);
                
                // Average values in the range
                let sum = 0;
                let count = 0;
                for (let j = start; j < end && j < this.data.length; j++) {
                    sum += this.data[j];
                    count++;
                }
                
                result.push(count > 0 ? sum / count : 0);
            }
        }
        
        return result;
    }

    /**
     * Get current value
     */
    getCurrentValue(): number | null {
        return this.data.length > 0 ? this.data[this.data.length - 1] : null;
    }

    /**
     * Get min value
     */
    getMin(): number {
        return this.min;
    }

    /**
     * Get max value
     */
    getMax(): number {
        return this.max;
    }

    /**
     * Get average value
     */
    getAverage(): number {
        if (this.data.length === 0) return 0;
        return this.data.reduce((sum, val) => sum + val, 0) / this.data.length;
    }

    /**
     * Get trend (positive, negative, or neutral)
     */
    getTrend(): 'up' | 'down' | 'neutral' {
        if (this.data.length < 2) return 'neutral';
        
        const recent = this.data.slice(-5); // Look at last 5 points
        const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
        const secondHalf = recent.slice(Math.floor(recent.length / 2));
        
        const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
        
        const diff = avgSecond - avgFirst;
        const threshold = this.range * 0.05; // 5% of range
        
        if (diff > threshold) return 'up';
        if (diff < -threshold) return 'down';
        return 'neutral';
    }

    /**
     * Render the sparkline
     */
    render(): string {
        switch (this.options.style) {
            case 'bar':
                return this.renderBar();
            case 'dots':
                return this.renderDots();
            case 'area':
                return this.renderArea();
            default:
                return this.renderLine();
        }
    }
}
