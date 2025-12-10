import { Chart, ChartOptions, DataPoint } from './chart';
import { Size } from './types';
import { AnsiUtils } from './ansi-utils';

/**
 * Line interpolation method
 */
export type LineInterpolation = 'linear' | 'step' | 'smooth';

/**
 * Line style
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'double';

/**
 * Point marker style
 */
export type PointMarker = 'none' | 'dot' | 'circle' | 'square' | 'triangle' | 'diamond' | 'cross' | 'plus';

/**
 * Line chart options
 */
export interface LineChartOptions extends ChartOptions {
    interpolation?: LineInterpolation;
    lineStyle?: LineStyle;
    showPoints?: boolean;
    pointMarker?: PointMarker;
    fillArea?: boolean;
    fillOpacity?: number;
    connectNulls?: boolean;
    tension?: number; // For smooth interpolation
}

/**
 * Line chart component
 */
export class LineChart extends Chart {
    protected lineOptions: Required<LineChartOptions>;
    private lineBuffer: (string | null)[][];

    constructor(
        id: string,
        data: DataPoint[] = [],
        options: LineChartOptions = {},
        size: Size = { width: 60, height: 20 }
    ) {
        super(id, data, options, size);
        
        this.lineOptions = {
            ...this.options,
            interpolation: options.interpolation || 'linear',
            lineStyle: options.lineStyle || 'solid',
            showPoints: options.showPoints ?? true,
            pointMarker: options.pointMarker || 'dot',
            fillArea: options.fillArea ?? false,
            fillOpacity: options.fillOpacity ?? 0.3,
            connectNulls: options.connectNulls ?? false,
            tension: options.tension ?? 0.4
        };
        
        // Initialize line buffer
        this.lineBuffer = [];
        for (let y = 0; y < this.size.height; y++) {
            this.lineBuffer[y] = new Array(this.size.width).fill(null);
        }
    }

    /**
     * Get line characters based on style
     */
    protected getLineChars(): { horizontal: string; vertical: string; diagonal: string[] } {
        switch (this.lineOptions.lineStyle) {
            case 'dashed':
                return {
                    horizontal: '╌',
                    vertical: '╎',
                    diagonal: ['╱', '╲']
                };
            case 'dotted':
                return {
                    horizontal: '·',
                    vertical: '·',
                    diagonal: ['·', '·']
                };
            case 'double':
                return {
                    horizontal: '═',
                    vertical: '║',
                    diagonal: ['╱', '╲']
                };
            default: // solid
                return {
                    horizontal: '─',
                    vertical: '│',
                    diagonal: ['╱', '╲']
                };
        }
    }

    /**
     * Get point marker character
     */
    protected getPointMarkerChar(marker: PointMarker): string {
        switch (marker) {
            case 'dot': return '•';
            case 'circle': return '○';
            case 'square': return '■';
            case 'triangle': return '▲';
            case 'diamond': return '◆';
            case 'cross': return '✕';
            case 'plus': return '+';
            default: return '';
        }
    }

    /**
     * Draw line between two points
     */
    protected drawLine(
        buffer: string[][],
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        color: number,
        seriesIndex: number
    ): void {
        const chars = this.getLineChars();
        
        // Bresenham's line algorithm
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (true) {
            // Determine line character based on direction
            let lineChar: string;
            if (dx > dy * 2) {
                lineChar = chars.horizontal;
            } else if (dy > dx * 2) {
                lineChar = chars.vertical;
            } else {
                lineChar = (sx * sy > 0) ? chars.diagonal[1] : chars.diagonal[0];
            }
            
            // Draw point if within bounds
            if (x >= this.chartArea.x && x < this.chartArea.x + this.chartArea.width &&
                y >= this.chartArea.y && y < this.chartArea.y + this.chartArea.height) {
                
                // Store in line buffer for layering
                if (!this.lineBuffer[y][x] || seriesIndex > 0) {
                    this.lineBuffer[y][x] = AnsiUtils.setForegroundColor(color) + lineChar + AnsiUtils.reset();
                }
            }
            
            if (x === x2 && y === y2) break;
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    /**
     * Draw smooth curve using cubic bezier interpolation
     */
    protected drawSmoothLine(
        buffer: string[][],
        points: { x: number; y: number }[],
        color: number,
        seriesIndex: number
    ): void {
        if (points.length < 2) return;
        
        const tension = this.lineOptions.tension;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            
            // Calculate control points
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            
            // Draw bezier curve using line segments
            const steps = Math.max(Math.abs(p2.x - p1.x), Math.abs(p2.y - p1.y));
            let prevX = p1.x;
            let prevY = p1.y;
            
            for (let t = 1; t <= steps; t++) {
                const s = t / steps;
                const s2 = s * s;
                const s3 = s2 * s;
                
                // Cubic bezier formula
                const x = Math.round(
                    (1 - s) * (1 - s) * (1 - s) * p1.x +
                    3 * (1 - s) * (1 - s) * s * cp1x +
                    3 * (1 - s) * s2 * cp2x +
                    s3 * p2.x
                );
                
                const y = Math.round(
                    (1 - s) * (1 - s) * (1 - s) * p1.y +
                    3 * (1 - s) * (1 - s) * s * cp1y +
                    3 * (1 - s) * s2 * cp2y +
                    s3 * p2.y
                );
                
                this.drawLine(buffer, prevX, prevY, x, y, color, seriesIndex);
                prevX = x;
                prevY = y;
            }
        }
    }

    /**
     * Draw step line
     */
    protected drawStepLine(
        buffer: string[][],
        points: { x: number; y: number }[],
        color: number,
        seriesIndex: number
    ): void {
        const chars = this.getLineChars();
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Draw horizontal line to next x position
            for (let x = p1.x; x !== p2.x; x += (p2.x > p1.x ? 1 : -1)) {
                if (x >= this.chartArea.x && x < this.chartArea.x + this.chartArea.width &&
                    p1.y >= this.chartArea.y && p1.y < this.chartArea.y + this.chartArea.height) {
                    if (!this.lineBuffer[p1.y][x] || seriesIndex > 0) {
                        this.lineBuffer[p1.y][x] = AnsiUtils.setForegroundColor(color) + chars.horizontal + AnsiUtils.reset();
                    }
                }
            }
            
            // Draw vertical line to next y position
            const startY = Math.min(p1.y, p2.y);
            const endY = Math.max(p1.y, p2.y);
            for (let y = startY; y <= endY; y++) {
                if (p2.x >= this.chartArea.x && p2.x < this.chartArea.x + this.chartArea.width &&
                    y >= this.chartArea.y && y < this.chartArea.y + this.chartArea.height) {
                    if (!this.lineBuffer[y][p2.x] || seriesIndex > 0) {
                        this.lineBuffer[y][p2.x] = AnsiUtils.setForegroundColor(color) + chars.vertical + AnsiUtils.reset();
                    }
                }
            }
        }
    }

    /**
     * Fill area under line
     */
    protected fillAreaUnderLine(
        buffer: string[][],
        points: { x: number; y: number }[],
        color: number,
        opacity: number
    ): void {
        // Use different fill characters based on opacity
        const fillChars = ['░', '▒', '▓'];
        const fillChar = fillChars[Math.min(2, Math.floor(opacity * 3))];
        
        // Create a map of y values for each x
        const yValues = new Map<number, number>();
        for (const point of points) {
            yValues.set(point.x, point.y);
        }
        
        // Fill from line to bottom
        for (let x = this.chartArea.x; x < this.chartArea.x + this.chartArea.width; x++) {
            const lineY = yValues.get(x);
            if (lineY !== undefined) {
                for (let y = lineY + 1; y < this.chartArea.y + this.chartArea.height; y++) {
                    if (!this.lineBuffer[y][x]) {
                        buffer[y][x] = AnsiUtils.setForegroundColor(color) + fillChar + AnsiUtils.reset();
                    }
                }
            }
        }
    }

    /**
     * Render lines for all series
     */
    protected renderLines(buffer: string[][]): void {
        // Clear line buffer
        for (let y = 0; y < this.size.height; y++) {
            for (let x = 0; x < this.size.width; x++) {
                this.lineBuffer[y][x] = null;
            }
        }
        
        let seriesIndex = 0;
        this.series.forEach((seriesData, seriesName) => {
            const color = this.getSeriesColor(seriesIndex);
            
            // Sort data by x position (label order)
            const sortedData = [...seriesData].sort((a, b) => {
                const aIndex = this.data.indexOf(a);
                const bIndex = this.data.indexOf(b);
                return aIndex - bIndex;
            });
            
            // Map data points to chart coordinates
            const chartPoints: { x: number; y: number }[] = [];
            sortedData.forEach((point, index) => {
                const coords = this.mapToChart(index, point.value);
                chartPoints.push(coords);
            });
            
            // Fill area if enabled (do this before drawing lines)
            if (this.lineOptions.fillArea && chartPoints.length > 1) {
                this.fillAreaUnderLine(buffer, chartPoints, color, this.lineOptions.fillOpacity);
            }
            
            // Draw lines based on interpolation
            if (chartPoints.length > 1) {
                switch (this.lineOptions.interpolation) {
                    case 'smooth':
                        this.drawSmoothLine(buffer, chartPoints, color, seriesIndex);
                        break;
                    case 'step':
                        this.drawStepLine(buffer, chartPoints, color, seriesIndex);
                        break;
                    default: // linear
                        for (let i = 0; i < chartPoints.length - 1; i++) {
                            this.drawLine(
                                buffer,
                                chartPoints[i].x,
                                chartPoints[i].y,
                                chartPoints[i + 1].x,
                                chartPoints[i + 1].y,
                                color,
                                seriesIndex
                            );
                        }
                }
            }
            
            // Draw points if enabled
            if (this.lineOptions.showPoints && this.lineOptions.pointMarker !== 'none') {
                const markerChar = this.getPointMarkerChar(this.lineOptions.pointMarker);
                chartPoints.forEach(point => {
                    if (point.x >= this.chartArea.x && point.x < this.chartArea.x + this.chartArea.width &&
                        point.y >= this.chartArea.y && point.y < this.chartArea.y + this.chartArea.height) {
                        this.lineBuffer[point.y][point.x] = AnsiUtils.setForegroundColor(color) + markerChar + AnsiUtils.reset();
                    }
                });
            }
            
            seriesIndex++;
        });
        
        // Copy line buffer to main buffer
        for (let y = 0; y < this.size.height; y++) {
            for (let x = 0; x < this.size.width; x++) {
                if (this.lineBuffer[y][x]) {
                    buffer[y][x] = this.lineBuffer[y][x];
                }
            }
        }
    }

    /**
     * Render the line chart
     */
    render(): string {
        const buffer = this.renderBase();
        
        // Render lines
        this.renderLines(buffer);
        
        // Add grid lines if desired (optional, could be added to options)
        if (this.options.yAxis?.show) {
            this.renderGridLines(buffer);
        }
        
        return this.bufferToString(buffer);
    }

    /**
     * Render grid lines
     */
    protected renderGridLines(buffer: string[][]): void {
        const gridChar = '·';
        const ticks = this.options.yAxis?.ticks || 5;
        
        // Horizontal grid lines
        for (let i = 1; i < ticks; i++) {
            const y = this.chartArea.y + Math.round((i / ticks) * this.chartArea.height);
            for (let x = this.chartArea.x; x < this.chartArea.x + this.chartArea.width; x++) {
                if (buffer[y][x] === ' ') {
                    buffer[y][x] = gridChar;
                }
            }
        }
    }
}
