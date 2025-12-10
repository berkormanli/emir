import { BaseComponent } from './base-component';
import { Size } from './types';
import { AnsiUtils } from './ansi-utils';

/**
 * Data point for charts
 */
export interface DataPoint {
    label: string;
    value: number;
    color?: number;
    series?: string;
}

/**
 * Chart axis configuration
 */
export interface AxisConfig {
    show: boolean;
    label?: string;
    min?: number;
    max?: number;
    ticks?: number;
    format?: (value: number) => string;
}

/**
 * Chart options
 */
export interface ChartOptions {
    title?: string;
    showLegend?: boolean;
    showValues?: boolean;
    xAxis?: AxisConfig;
    yAxis?: AxisConfig;
    padding?: number | [number, number] | [number, number, number, number];
    colors?: number[];
    symbols?: string[];
    border?: boolean | 'single' | 'double' | 'rounded';
}

/**
 * Base chart component
 */
export abstract class Chart extends BaseComponent {
    protected data: DataPoint[];
    protected options: Required<ChartOptions>;
    protected chartArea: { x: number; y: number; width: number; height: number };
    protected scale: { minX: number; maxX: number; minY: number; maxY: number };
    protected series: Map<string, DataPoint[]>;

    constructor(
        id: string,
        data: DataPoint[] = [],
        options: ChartOptions = {},
        size: Size = { width: 60, height: 20 }
    ) {
        super(id);
        this.data = data;
        this.size = size;
        
        // Set default options
        this.options = {
            title: options.title || '',
            showLegend: options.showLegend ?? false,
            showValues: options.showValues ?? false,
            xAxis: {
                show: true,
                ...options.xAxis
            },
            yAxis: {
                show: true,
                ...options.yAxis
            },
            padding: options.padding ?? 1,
            colors: options.colors || [1, 2, 3, 4, 5, 6, 7],
            symbols: options.symbols || ['●', '■', '▲', '◆', '★', '♦', '♠'],
            border: options.border ?? false
        };
        
        this.chartArea = this.calculateChartArea();
        this.scale = this.calculateScale();
        this.series = this.groupBySeries();
    }

    /**
     * Set chart data
     */
    setData(data: DataPoint[]): void {
        this.data = data;
        this.scale = this.calculateScale();
        this.series = this.groupBySeries();
        this.markDirty();
    }

    /**
     * Add data point
     */
    addDataPoint(point: DataPoint): void {
        this.data.push(point);
        this.scale = this.calculateScale();
        this.series = this.groupBySeries();
        this.markDirty();
    }

    /**
     * Clear all data
     */
    clearData(): void {
        this.data = [];
        this.series.clear();
        this.markDirty();
    }

    /**
     * Update options
     */
    updateOptions(options: Partial<ChartOptions>): void {
        this.options = { ...this.options, ...options };
        this.chartArea = this.calculateChartArea();
        this.markDirty();
    }

    /**
     * Calculate chart area based on padding and axes
     */
    protected calculateChartArea(): { x: number; y: number; width: number; height: number } {
        const padding = this.normalizePadding(this.options.padding);
        let x = padding[3];
        let y = padding[0];
        let width = this.size.width - padding[1] - padding[3];
        let height = this.size.height - padding[0] - padding[2];
        
        // Adjust for title
        if (this.options.title) {
            y += 2;
            height -= 2;
        }
        
        // Adjust for axes
        if (this.options.yAxis.show) {
            const maxLabel = this.getMaxYLabelWidth();
            x += maxLabel + 2;
            width -= maxLabel + 2;
        }
        
        if (this.options.xAxis.show) {
            height -= 2;
        }
        
        // Adjust for legend
        if (this.options.showLegend && this.series.size > 0) {
            height -= this.series.size + 1;
        }
        
        return { x, y, width: Math.max(1, width), height: Math.max(1, height) };
    }

    /**
     * Calculate scale from data
     */
    protected calculateScale(): { minX: number; maxX: number; minY: number; maxY: number } {
        if (this.data.length === 0) {
            return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
        }
        
        const values = this.data.map(d => d.value);
        let minY = this.options.yAxis.min ?? Math.min(...values, 0);
        let maxY = this.options.yAxis.max ?? Math.max(...values);
        
        // Add some padding to the scale
        const range = maxY - minY;
        if (range === 0) {
            minY -= 1;
            maxY += 1;
        } else {
            const padding = range * 0.1;
            if (this.options.yAxis.min === undefined) minY -= padding;
            if (this.options.yAxis.max === undefined) maxY += padding;
        }
        
        return {
            minX: 0,
            maxX: Math.max(this.data.length - 1, 1),
            minY,
            maxY
        };
    }

    /**
     * Group data by series
     */
    protected groupBySeries(): Map<string, DataPoint[]> {
        const series = new Map<string, DataPoint[]>();
        
        for (const point of this.data) {
            const seriesName = point.series || 'default';
            if (!series.has(seriesName)) {
                series.set(seriesName, []);
            }
            series.get(seriesName)!.push(point);
        }
        
        return series;
    }

    /**
     * Get maximum Y axis label width
     */
    protected getMaxYLabelWidth(): number {
        if (!this.options.yAxis.show) return 0;
        
        const ticks = this.options.yAxis.ticks || 5;
        const range = this.scale.maxY - this.scale.minY;
        let maxWidth = 0;
        
        for (let i = 0; i <= ticks; i++) {
            const value = this.scale.minY + (range * i / ticks);
            const label = this.formatYValue(value);
            maxWidth = Math.max(maxWidth, label.length);
        }
        
        return maxWidth;
    }

    /**
     * Format Y axis value
     */
    protected formatYValue(value: number): string {
        if (this.options.yAxis.format) {
            return this.options.yAxis.format(value);
        }
        
        // Default formatting
        if (Math.abs(value) >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        } else if (value % 1 === 0) {
            return value.toString();
        } else {
            return value.toFixed(1);
        }
    }

    /**
     * Normalize padding
     */
    protected normalizePadding(padding: number | [number, number] | [number, number, number, number]): [number, number, number, number] {
        if (typeof padding === 'number') {
            return [padding, padding, padding, padding];
        } else if (padding.length === 2) {
            return [padding[0], padding[1], padding[0], padding[1]];
        } else {
            return padding;
        }
    }

    /**
     * Map value to chart coordinates
     */
    protected mapToChart(x: number, y: number): { x: number; y: number } {
        const xRange = this.scale.maxX - this.scale.minX;
        const yRange = this.scale.maxY - this.scale.minY;
        
        const chartX = Math.round(
            this.chartArea.x + 
            ((x - this.scale.minX) / xRange) * (this.chartArea.width - 1)
        );
        
        const chartY = Math.round(
            this.chartArea.y + 
            this.chartArea.height - 1 - 
            ((y - this.scale.minY) / yRange) * (this.chartArea.height - 1)
        );
        
        return { x: chartX, y: chartY };
    }

    /**
     * Get color for series
     */
    protected getSeriesColor(seriesIndex: number): number {
        return this.options.colors[seriesIndex % this.options.colors.length];
    }

    /**
     * Get symbol for series
     */
    protected getSeriesSymbol(seriesIndex: number): string {
        return this.options.symbols[seriesIndex % this.options.symbols.length];
    }

    /**
     * Render base chart elements
     */
    protected renderBase(): string[][] {
        const buffer: string[][] = [];
        
        // Initialize buffer
        for (let y = 0; y < this.size.height; y++) {
            buffer[y] = new Array(this.size.width).fill(' ');
        }
        
        // Render border
        if (this.options.border) {
            this.renderBorder(buffer);
        }
        
        // Render title
        if (this.options.title) {
            this.renderTitle(buffer);
        }
        
        // Render axes
        if (this.options.yAxis.show) {
            this.renderYAxis(buffer);
        }
        
        if (this.options.xAxis.show) {
            this.renderXAxis(buffer);
        }
        
        // Render legend
        if (this.options.showLegend && this.series.size > 0) {
            this.renderLegend(buffer);
        }
        
        return buffer;
    }

    /**
     * Render border
     */
    protected renderBorder(buffer: string[][]): void {
        const style = this.options.border === true ? 'single' : this.options.border;
        const chars = this.getBorderChars(style as string);
        
        // Top border
        buffer[0][0] = chars.topLeft;
        buffer[0][this.size.width - 1] = chars.topRight;
        for (let x = 1; x < this.size.width - 1; x++) {
            buffer[0][x] = chars.horizontal;
        }
        
        // Bottom border
        buffer[this.size.height - 1][0] = chars.bottomLeft;
        buffer[this.size.height - 1][this.size.width - 1] = chars.bottomRight;
        for (let x = 1; x < this.size.width - 1; x++) {
            buffer[this.size.height - 1][x] = chars.horizontal;
        }
        
        // Side borders
        for (let y = 1; y < this.size.height - 1; y++) {
            buffer[y][0] = chars.vertical;
            buffer[y][this.size.width - 1] = chars.vertical;
        }
    }

    /**
     * Get border characters
     */
    protected getBorderChars(style: string): any {
        switch (style) {
            case 'double':
                return {
                    topLeft: '╔', topRight: '╗',
                    bottomLeft: '╚', bottomRight: '╝',
                    horizontal: '═', vertical: '║'
                };
            case 'rounded':
                return {
                    topLeft: '╭', topRight: '╮',
                    bottomLeft: '╰', bottomRight: '╯',
                    horizontal: '─', vertical: '│'
                };
            default: // single
                return {
                    topLeft: '┌', topRight: '┐',
                    bottomLeft: '└', bottomRight: '┘',
                    horizontal: '─', vertical: '│'
                };
        }
    }

    /**
     * Render title
     */
    protected renderTitle(buffer: string[][]): void {
        const title = this.options.title;
        const x = Math.floor((this.size.width - title.length) / 2);
        const y = this.options.border ? 1 : 0;
        
        for (let i = 0; i < title.length && x + i < this.size.width; i++) {
            buffer[y][x + i] = title[i];
        }
    }

    /**
     * Render Y axis
     */
    protected renderYAxis(buffer: string[][]): void {
        const ticks = this.options.yAxis.ticks || 5;
        const range = this.scale.maxY - this.scale.minY;
        
        for (let i = 0; i <= ticks; i++) {
            const value = this.scale.minY + (range * i / ticks);
            const label = this.formatYValue(value);
            const y = this.chartArea.y + this.chartArea.height - 1 - 
                     Math.round((i / ticks) * (this.chartArea.height - 1));
            
            // Render tick mark
            if (y >= 0 && y < this.size.height) {
                buffer[y][this.chartArea.x - 1] = '┤';
                
                // Render label
                const labelX = this.chartArea.x - label.length - 2;
                for (let j = 0; j < label.length && labelX + j >= 0; j++) {
                    buffer[y][labelX + j] = label[j];
                }
            }
        }
        
        // Render axis line
        for (let y = this.chartArea.y; y < this.chartArea.y + this.chartArea.height; y++) {
            if (buffer[y][this.chartArea.x - 1] === ' ') {
                buffer[y][this.chartArea.x - 1] = '│';
            }
        }
    }

    /**
     * Render X axis
     */
    protected renderXAxis(buffer: string[][]): void {
        const y = this.chartArea.y + this.chartArea.height;
        
        // Render axis line
        for (let x = this.chartArea.x; x < this.chartArea.x + this.chartArea.width; x++) {
            if (y < this.size.height) {
                buffer[y][x] = '─';
            }
        }
        
        // Render labels if space permits
        if (y + 1 < this.size.height && this.data.length > 0) {
            const step = Math.ceil(this.data.length / Math.floor(this.chartArea.width / 4));
            
            for (let i = 0; i < this.data.length; i += step) {
                const point = this.data[i];
                const chartX = this.mapToChart(i, 0).x;
                const label = point.label.substring(0, 3);
                
                for (let j = 0; j < label.length && chartX + j < this.chartArea.x + this.chartArea.width; j++) {
                    buffer[y + 1][chartX + j] = label[j];
                }
            }
        }
    }

    /**
     * Render legend
     */
    protected renderLegend(buffer: string[][]): void {
        const legendY = this.size.height - this.series.size - 1;
        let seriesIndex = 0;
        
        this.series.forEach((points, name) => {
            const color = this.getSeriesColor(seriesIndex);
            const symbol = this.getSeriesSymbol(seriesIndex);
            const legend = `${symbol} ${name}`;
            
            const x = 2 + seriesIndex * 15;
            const y = legendY + seriesIndex;
            
            if (y < this.size.height) {
                // Render colored symbol
                const coloredSymbol = AnsiUtils.setForegroundColor(color) + symbol + AnsiUtils.reset();
                buffer[y][x] = coloredSymbol;
                
                // Render name
                for (let i = 0; i < name.length && x + 2 + i < this.size.width; i++) {
                    buffer[y][x + 2 + i] = name[i];
                }
            }
            
            seriesIndex++;
        });
    }

    /**
     * Buffer to string
     */
    protected bufferToString(buffer: string[][]): string {
        return buffer.map(row => row.join('')).join('\n');
    }

    /**
     * Abstract render method
     */
    abstract render(): string;
}
