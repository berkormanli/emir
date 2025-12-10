import { Chart, ChartOptions, DataPoint } from './chart';
import { Size } from './types';
import { AnsiUtils } from './ansi-utils';

/**
 * Bar chart orientation
 */
export type BarOrientation = 'vertical' | 'horizontal';

/**
 * Bar chart style
 */
export type BarStyle = 'block' | 'ascii' | 'unicode';

/**
 * Bar chart options
 */
export interface BarChartOptions extends ChartOptions {
    orientation?: BarOrientation;
    barWidth?: number;
    barGap?: number;
    barStyle?: BarStyle;
    showBarValues?: boolean;
    groupedBars?: boolean;
    stackedBars?: boolean;
    baseValue?: number;
}

/**
 * Bar chart component
 */
export class BarChart extends Chart {
    protected barOptions: Required<BarChartOptions>;

    constructor(
        id: string,
        data: DataPoint[] = [],
        options: BarChartOptions = {},
        size: Size = { width: 60, height: 20 }
    ) {
        super(id, data, options, size);
        
        this.barOptions = {
            ...this.options,
            orientation: options.orientation || 'vertical',
            barWidth: options.barWidth || 1,
            barGap: options.barGap || 1,
            barStyle: options.barStyle || 'block',
            showBarValues: options.showBarValues ?? false,
            groupedBars: options.groupedBars ?? false,
            stackedBars: options.stackedBars ?? false,
            baseValue: options.baseValue ?? 0
        };
        
        // Adjust for stacked bars
        if (this.barOptions.stackedBars) {
            this.scale = this.calculateStackedScale();
        }
    }

    /**
     * Calculate scale for stacked bars
     */
    protected calculateStackedScale(): { minX: number; maxX: number; minY: number; maxY: number } {
        if (this.data.length === 0) {
            return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
        }
        
        // Group by label and sum values
        const stackedValues = new Map<string, number>();
        for (const point of this.data) {
            const current = stackedValues.get(point.label) || 0;
            stackedValues.set(point.label, current + Math.abs(point.value));
        }
        
        const maxValue = Math.max(...stackedValues.values());
        const minValue = this.barOptions.baseValue;
        
        return {
            minX: 0,
            maxX: stackedValues.size - 1,
            minY: minValue,
            maxY: maxValue * 1.1 // Add 10% padding
        };
    }

    /**
     * Get bar characters based on style
     */
    protected getBarChars(): string[] {
        switch (this.barOptions.barStyle) {
            case 'ascii':
                return this.barOptions.orientation === 'vertical' 
                    ? ['|', '#', '*', '@']
                    : ['-', '=', '#', '@'];
            case 'unicode':
                return this.barOptions.orientation === 'vertical'
                    ? ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
                    : ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
            default: // block
                return ['█'];
        }
    }

    /**
     * Render vertical bars
     */
    protected renderVerticalBars(buffer: string[][]): void {
        const chars = this.getBarChars();
        const barChar = chars[chars.length - 1];
        
        if (this.barOptions.stackedBars) {
            this.renderStackedVerticalBars(buffer);
        } else if (this.barOptions.groupedBars && this.series.size > 1) {
            this.renderGroupedVerticalBars(buffer);
        } else {
            this.renderSimpleVerticalBars(buffer);
        }
    }

    /**
     * Render simple vertical bars
     */
    protected renderSimpleVerticalBars(buffer: string[][]): void {
        const barChar = this.getBarChars()[0];
        const barWidth = this.barOptions.barWidth;
        const barGap = this.barOptions.barGap;
        const totalWidth = barWidth + barGap;
        
        this.data.forEach((point, index) => {
            const barHeight = Math.abs(point.value - this.barOptions.baseValue);
            const normalizedHeight = (barHeight / (this.scale.maxY - this.scale.minY)) * this.chartArea.height;
            const barHeightPixels = Math.round(normalizedHeight);
            
            const barX = this.chartArea.x + index * totalWidth;
            const color = point.color || this.getSeriesColor(0);
            
            // Draw bar
            for (let h = 0; h < barHeightPixels; h++) {
                const y = this.chartArea.y + this.chartArea.height - 1 - h;
                for (let w = 0; w < barWidth && barX + w < this.chartArea.x + this.chartArea.width; w++) {
                    if (y >= this.chartArea.y && y < this.chartArea.y + this.chartArea.height) {
                        buffer[y][barX + w] = AnsiUtils.setForegroundColor(color) + barChar + AnsiUtils.reset();
                    }
                }
            }
            
            // Show value on top of bar if enabled
            if (this.barOptions.showBarValues) {
                const valueStr = this.formatYValue(point.value);
                const valueY = this.chartArea.y + this.chartArea.height - barHeightPixels - 1;
                if (valueY >= this.chartArea.y) {
                    for (let i = 0; i < valueStr.length && barX + i < this.chartArea.x + this.chartArea.width; i++) {
                        buffer[valueY][barX + i] = valueStr[i];
                    }
                }
            }
        });
    }

    /**
     * Render grouped vertical bars
     */
    protected renderGroupedVerticalBars(buffer: string[][]): void {
        const barChar = this.getBarChars()[0];
        const seriesCount = this.series.size;
        const groupWidth = this.barOptions.barWidth * seriesCount + this.barOptions.barGap;
        
        // Get unique labels
        const labels = new Set<string>();
        this.data.forEach(point => labels.add(point.label));
        const labelArray = Array.from(labels);
        
        let seriesIndex = 0;
        this.series.forEach((points, seriesName) => {
            const color = this.getSeriesColor(seriesIndex);
            
            points.forEach(point => {
                const labelIndex = labelArray.indexOf(point.label);
                const barX = this.chartArea.x + labelIndex * groupWidth + seriesIndex * this.barOptions.barWidth;
                
                const barHeight = Math.abs(point.value - this.barOptions.baseValue);
                const normalizedHeight = (barHeight / (this.scale.maxY - this.scale.minY)) * this.chartArea.height;
                const barHeightPixels = Math.round(normalizedHeight);
                
                // Draw bar
                for (let h = 0; h < barHeightPixels; h++) {
                    const y = this.chartArea.y + this.chartArea.height - 1 - h;
                    if (y >= this.chartArea.y && barX < this.chartArea.x + this.chartArea.width) {
                        buffer[y][barX] = AnsiUtils.setForegroundColor(color) + barChar + AnsiUtils.reset();
                    }
                }
            });
            
            seriesIndex++;
        });
    }

    /**
     * Render stacked vertical bars
     */
    protected renderStackedVerticalBars(buffer: string[][]): void {
        const barChar = this.getBarChars()[0];
        const barWidth = this.barOptions.barWidth;
        const barGap = this.barOptions.barGap;
        const totalWidth = barWidth + barGap;
        
        // Group by label
        const stacks = new Map<string, DataPoint[]>();
        this.data.forEach(point => {
            if (!stacks.has(point.label)) {
                stacks.set(point.label, []);
            }
            stacks.get(point.label)!.push(point);
        });
        
        let stackIndex = 0;
        stacks.forEach((stack, label) => {
            const barX = this.chartArea.x + stackIndex * totalWidth;
            let currentHeight = 0;
            
            stack.forEach((point, pointIndex) => {
                const barHeight = Math.abs(point.value);
                const normalizedHeight = (barHeight / (this.scale.maxY - this.scale.minY)) * this.chartArea.height;
                const barHeightPixels = Math.round(normalizedHeight);
                
                const color = point.color || this.getSeriesColor(pointIndex);
                
                // Draw bar segment
                for (let h = 0; h < barHeightPixels; h++) {
                    const y = this.chartArea.y + this.chartArea.height - 1 - currentHeight - h;
                    for (let w = 0; w < barWidth && barX + w < this.chartArea.x + this.chartArea.width; w++) {
                        if (y >= this.chartArea.y && y < this.chartArea.y + this.chartArea.height) {
                            buffer[y][barX + w] = AnsiUtils.setForegroundColor(color) + barChar + AnsiUtils.reset();
                        }
                    }
                }
                
                currentHeight += barHeightPixels;
            });
            
            // Show total value on top if enabled
            if (this.barOptions.showBarValues) {
                const total = stack.reduce((sum, p) => sum + Math.abs(p.value), 0);
                const valueStr = this.formatYValue(total);
                const valueY = this.chartArea.y + this.chartArea.height - currentHeight - 1;
                if (valueY >= this.chartArea.y) {
                    for (let i = 0; i < valueStr.length && barX + i < this.chartArea.x + this.chartArea.width; i++) {
                        buffer[valueY][barX + i] = valueStr[i];
                    }
                }
            }
            
            stackIndex++;
        });
    }

    /**
     * Render horizontal bars
     */
    protected renderHorizontalBars(buffer: string[][]): void {
        const chars = this.getBarChars();
        const barChar = chars[chars.length - 1];
        
        if (this.barOptions.stackedBars) {
            this.renderStackedHorizontalBars(buffer);
        } else if (this.barOptions.groupedBars && this.series.size > 1) {
            this.renderGroupedHorizontalBars(buffer);
        } else {
            this.renderSimpleHorizontalBars(buffer);
        }
    }

    /**
     * Render simple horizontal bars
     */
    protected renderSimpleHorizontalBars(buffer: string[][]): void {
        const barChar = this.getBarChars()[0];
        const barHeight = this.barOptions.barWidth;
        const barGap = this.barOptions.barGap;
        const totalHeight = barHeight + barGap;
        
        this.data.forEach((point, index) => {
            const barWidth = Math.abs(point.value - this.barOptions.baseValue);
            const normalizedWidth = (barWidth / (this.scale.maxY - this.scale.minY)) * this.chartArea.width;
            const barWidthPixels = Math.round(normalizedWidth);
            
            const barY = this.chartArea.y + index * totalHeight;
            const color = point.color || this.getSeriesColor(0);
            
            // Draw bar
            for (let w = 0; w < barWidthPixels; w++) {
                const x = this.chartArea.x + w;
                for (let h = 0; h < barHeight && barY + h < this.chartArea.y + this.chartArea.height; h++) {
                    if (x < this.chartArea.x + this.chartArea.width) {
                        buffer[barY + h][x] = AnsiUtils.setForegroundColor(color) + barChar + AnsiUtils.reset();
                    }
                }
            }
            
            // Show value at end of bar if enabled
            if (this.barOptions.showBarValues) {
                const valueStr = this.formatYValue(point.value);
                const valueX = this.chartArea.x + barWidthPixels + 1;
                if (valueX + valueStr.length <= this.chartArea.x + this.chartArea.width) {
                    for (let i = 0; i < valueStr.length; i++) {
                        buffer[barY][valueX + i] = valueStr[i];
                    }
                }
            }
            
            // Show label
            const labelX = this.chartArea.x - point.label.length - 1;
            if (labelX >= 0) {
                for (let i = 0; i < point.label.length; i++) {
                    buffer[barY][labelX + i] = point.label[i];
                }
            }
        });
    }

    /**
     * Render grouped horizontal bars
     */
    protected renderGroupedHorizontalBars(buffer: string[][]): void {
        const barChar = this.getBarChars()[0];
        const seriesCount = this.series.size;
        const groupHeight = this.barOptions.barWidth * seriesCount + this.barOptions.barGap;
        
        // Get unique labels
        const labels = new Set<string>();
        this.data.forEach(point => labels.add(point.label));
        const labelArray = Array.from(labels);
        
        let seriesIndex = 0;
        this.series.forEach((points, seriesName) => {
            const color = this.getSeriesColor(seriesIndex);
            
            points.forEach(point => {
                const labelIndex = labelArray.indexOf(point.label);
                const barY = this.chartArea.y + labelIndex * groupHeight + seriesIndex * this.barOptions.barWidth;
                
                const barWidth = Math.abs(point.value - this.barOptions.baseValue);
                const normalizedWidth = (barWidth / (this.scale.maxY - this.scale.minY)) * this.chartArea.width;
                const barWidthPixels = Math.round(normalizedWidth);
                
                // Draw bar
                for (let w = 0; w < barWidthPixels; w++) {
                    const x = this.chartArea.x + w;
                    if (barY < this.chartArea.y + this.chartArea.height && x < this.chartArea.x + this.chartArea.width) {
                        buffer[barY][x] = AnsiUtils.setForegroundColor(color) + barChar + AnsiUtils.reset();
                    }
                }
            });
            
            seriesIndex++;
        });
    }

    /**
     * Render stacked horizontal bars
     */
    protected renderStackedHorizontalBars(buffer: string[][]): void {
        const barChar = this.getBarChars()[0];
        const barHeight = this.barOptions.barWidth;
        const barGap = this.barOptions.barGap;
        const totalHeight = barHeight + barGap;
        
        // Group by label
        const stacks = new Map<string, DataPoint[]>();
        this.data.forEach(point => {
            if (!stacks.has(point.label)) {
                stacks.set(point.label, []);
            }
            stacks.get(point.label)!.push(point);
        });
        
        let stackIndex = 0;
        stacks.forEach((stack, label) => {
            const barY = this.chartArea.y + stackIndex * totalHeight;
            let currentWidth = 0;
            
            stack.forEach((point, pointIndex) => {
                const barWidth = Math.abs(point.value);
                const normalizedWidth = (barWidth / (this.scale.maxY - this.scale.minY)) * this.chartArea.width;
                const barWidthPixels = Math.round(normalizedWidth);
                
                const color = point.color || this.getSeriesColor(pointIndex);
                
                // Draw bar segment
                for (let w = 0; w < barWidthPixels; w++) {
                    const x = this.chartArea.x + currentWidth + w;
                    for (let h = 0; h < barHeight && barY + h < this.chartArea.y + this.chartArea.height; h++) {
                        if (x < this.chartArea.x + this.chartArea.width) {
                            buffer[barY + h][x] = AnsiUtils.setForegroundColor(color) + barChar + AnsiUtils.reset();
                        }
                    }
                }
                
                currentWidth += barWidthPixels;
            });
            
            // Show total value at end if enabled
            if (this.barOptions.showBarValues) {
                const total = stack.reduce((sum, p) => sum + Math.abs(p.value), 0);
                const valueStr = this.formatYValue(total);
                const valueX = this.chartArea.x + currentWidth + 1;
                if (valueX + valueStr.length <= this.chartArea.x + this.chartArea.width) {
                    for (let i = 0; i < valueStr.length; i++) {
                        buffer[barY][valueX + i] = valueStr[i];
                    }
                }
            }
            
            // Show label
            const labelX = this.chartArea.x - label.length - 1;
            if (labelX >= 0) {
                for (let i = 0; i < label.length; i++) {
                    buffer[barY][labelX + i] = label[i];
                }
            }
            
            stackIndex++;
        });
    }

    /**
     * Render the bar chart
     */
    render(): string {
        const buffer = this.renderBase();
        
        // Render bars based on orientation
        if (this.barOptions.orientation === 'vertical') {
            this.renderVerticalBars(buffer);
        } else {
            this.renderHorizontalBars(buffer);
        }
        
        return this.bufferToString(buffer);
    }
}
