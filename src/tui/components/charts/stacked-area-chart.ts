import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface DataPoint {
    x: number | string;
    y: number;
}

export interface Series {
    name: string;
    data: DataPoint[];
    color?: string;
    fill?: boolean;
}

export interface StackedAreaChartConfig {
    stacked?: boolean;
    area?: boolean;
    showGrid?: boolean;
    showXAxis?: boolean;
    showYAxis?: boolean;
    showLegend?: boolean;
    xLabel?: string;
    yLabel?: string;
    maxDataPoints?: number;
    width?: number;
    height?: number;
    padding?: number;
}

export class StackedAreaChart extends BaseComponent {
    private series: Series[] = [];
    private config: Required<StackedAreaChartConfig>;
    private theme: ThemeManager;
    private minX = 0;
    private maxX = 100;
    private minY = 0;
    private maxY = 100;
    private hoveredPoint: { series: string; point: DataPoint } | null = null;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: StackedAreaChartConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            stacked: config.stacked ?? true,
            area: config.area ?? true,
            showGrid: config.showGrid ?? true,
            showXAxis: config.showXAxis ?? true,
            showYAxis: config.showYAxis ?? true,
            showLegend: config.showLegend ?? true,
            xLabel: config.xLabel ?? '',
            yLabel: config.yLabel ?? '',
            maxDataPoints: config.maxDataPoints ?? 50,
            width: config.width ?? size.width,
            height: config.height ?? size.height,
            padding: config.padding ?? 2
        };
        this.theme = ThemeManager.getInstance();
    }

    addSeries(series: Series): void {
        this.series.push(series);
        this.updateBounds();
        this.markDirty();
    }

    removeSeries(seriesName: string): void {
        this.series = this.series.filter(s => s.name !== seriesName);
        this.updateBounds();
        this.markDirty();
    }

    updateSeries(seriesName: string, data: DataPoint[]): void {
        const series = this.series.find(s => s.name === seriesName);
        if (series) {
            series.data = data.slice(-this.config.maxDataPoints);
            this.updateBounds();
            this.markDirty();
        }
    }

    addDataPoint(seriesName: string, point: DataPoint): void {
        const series = this.series.find(s => s.name === seriesName);
        if (series) {
            series.data.push(point);
            if (series.data.length > this.config.maxDataPoints) {
                series.data.shift();
            }
            this.updateBounds();
            this.markDirty();
        }
    }

    clearAllSeries(): void {
        for (const series of this.series) {
            series.data = [];
        }
        this.markDirty();
    }

    private updateBounds(): void {
        if (this.series.length === 0) return;

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = 0;
        let maxY = -Infinity;

        for (const series of this.series) {
            for (const point of series.data) {
                const xValue = typeof point.x === 'number' ? point.x : 0;
                minX = Math.min(minX, xValue);
                maxX = Math.max(maxX, xValue);
                maxY = Math.max(maxY, point.y);
            }
        }

        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;

        if (this.config.stacked) {
            this.calculateStackedBounds();
        }
    }

    private calculateStackedBounds(): void {
        if (this.series.length === 0) return;

        const xValues = new Set<number>();
        for (const series of this.series) {
            for (const point of series.data) {
                if (typeof point.x === 'number') {
                    xValues.add(point.x);
                }
            }
        }

        let maxY = 0;
        for (const x of xValues) {
            let stackedY = 0;
            for (const series of this.series) {
                const point = series.data.find(p => typeof p.x === 'number' && p.x === x);
                if (point) {
                    stackedY += point.y;
                }
            }
            maxY = Math.max(maxY, stackedY);
        }

        this.maxY = maxY;
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }
        return false;
    }

    private handleMouseInput(input: InputEvent): boolean {
        if (!input.mouse) return false;

        const x = input.mouse.x - this.position.x;
        const y = input.mouse.y - this.position.y;

        const chartArea = {
            x: this.config.padding,
            y: this.config.padding,
            width: this.size.width - this.config.padding * 2,
            height: this.size.height - this.config.padding * 2
        };

        if (x < chartArea.x || x > chartArea.x + chartArea.width ||
            y < chartArea.y || y > chartArea.y + chartArea.height) {
            this.hoveredPoint = null;
            return false;
        }

        const relativeX = (x - chartArea.x) / chartArea.width;
        const dataX = this.minX + relativeX * (this.maxX - this.minX);

        this.hoveredPoint = this.findNearestPoint(dataX);
        this.markDirty();

        return true;
    }

    private findNearestPoint(x: number): { series: string; point: DataPoint } | null {
        let nearest: { series: string; point: DataPoint; distance: number } | null = null;

        for (const series of this.series) {
            for (const point of series.data) {
                if (typeof point.x === 'number') {
                    const distance = Math.abs(point.x - x);
                    if (!nearest || distance < nearest.distance) {
                        nearest = { series: series.name, point, distance };
                    }
                }
            }
        }

        return nearest && nearest.distance < (this.maxX - this.minX) * 0.05 ? nearest : null;
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const chartHeight = this.size.height - this.config.padding * 2;
        const chartWidth = this.size.width - this.config.padding * 2;

        for (let y = 0; y < this.size.height; y++) {
            let line = '';

            for (let x = 0; x < this.size.width; x++) {
                if (y < this.config.padding || y >= this.size.height - this.config.padding ||
                    x < this.config.padding || x >= this.size.width - this.config.padding) {
                    if (this.config.showGrid && this.shouldDrawGridLine(x, y)) {
                        line += this.theme.applyColor('·', 'muted');
                    } else if (this.shouldDrawAxis(x, y)) {
                        line += this.theme.applyColor('│', 'border');
                    } else {
                        line += ' ';
                    }
                } else {
                    const char = this.getChartCharacter(x - this.config.padding, y - this.config.padding, chartWidth, chartHeight);
                    line += char;
                }
            }

            lines.push(line);
        }

        if (this.config.showLegend && this.series.length > 0) {
            lines.push('');
            const legendLine = this.renderLegend();
            lines.push(legendLine);
        }

        if (this.hoveredPoint) {
            lines.push('');
            const tooltip = this.renderTooltip();
            lines.push(tooltip);
        }

        return lines.join('\n');
    }

    private shouldDrawGridLine(x: number, y: number): boolean {
        if (!this.config.showGrid) return false;

        const gridInterval = 5;
        return (x % gridInterval === 0 && y >= this.config.padding && y < this.size.height - this.config.padding) ||
               (y % gridInterval === 0 && x >= this.config.padding && x < this.size.width - this.config.padding);
    }

    private shouldDrawAxis(x: number, y: number): boolean {
        return (x === this.config.padding && y >= this.config.padding && y < this.size.height - this.config.padding) ||
               (y === this.size.height - this.config.padding && x >= this.config.padding && x < this.size.width - this.config.padding);
    }

    private getChartCharacter(x: number, y: number, width: number, height: number): string {
        const relativeX = x / width;
        const relativeY = 1 - (y / height);

        const dataX = this.minX + relativeX * (this.maxX - this.minX);
        const dataY = this.minY + relativeY * (this.maxY - this.minY);

        if (this.config.stacked) {
            return this.getStackedChar(dataX, dataY, relativeX, relativeY);
        } else {
            return this.getSeriesChar(dataX, dataY);
        }
    }

    private getStackedChar(x: number, y: number, relativeX: number, relativeY: number): string {
        const theme = this.theme.getCurrentTheme();

        for (let i = this.series.length - 1; i >= 0; i--) {
            const series = this.series[i];
            const color = series.color ?? this.getSeriesColor(i);

            let stackedY = 0;
            const xValues = new Set<number>();
            for (const s of this.series) {
                for (const point of s.data) {
                    if (typeof point.x === 'number') xValues.add(point.x);
                }
            }

            const sortedX = Array.from(xValues).sort((a, b) => a - b);
            for (let j = 0; j < sortedX.length - 1; j++) {
                const x1 = sortedX[j];
                const x2 = sortedX[j + 1];

                if (x >= x1 && x <= x2) {
                    const progress = (x - x1) / (x2 - x1);
                    let y1 = 0;
                    let y2 = 0;

                    for (let k = 0; k <= i; k++) {
                        const s = this.series[k];
                        const p1 = s.data.find(p => typeof p.x === 'number' && p.x === x1);
                        const p2 = s.data.find(p => typeof p.x === 'number' && p.x === x2);
                        y1 += p1 ? p1.y : 0;
                        y2 += p2 ? p2.y : 0;
                    }

                    const seriesY = y1 + (y2 - y1) * progress;
                    const normalizedY = seriesY / this.maxY;

                    if (Math.abs(relativeY - (1 - normalizedY)) < 0.02) {
                        return this.theme.applyColor('●', color);
                    } else if (relativeY > (1 - normalizedY) && i === this.series.length - 1) {
                        return this.theme.applyColor('█', color);
                    }
                }
            }
        }

        return ' ';
    }

    private getSeriesChar(x: number, y: number): string {
        const theme = this.theme.getCurrentTheme();

        for (let i = this.series.length - 1; i >= 0; i--) {
            const series = this.series[i];
            const color = series.color ?? this.getSeriesColor(i);

            for (let j = 0; j < series.data.length - 1; j++) {
                const p1 = series.data[j];
                const p2 = series.data[j + 1];

                if (typeof p1.x === 'number' && typeof p2.x === 'number') {
                    if (x >= p1.x && x <= p2.x) {
                        const progress = (x - p1.x) / (p2.x - p1.x);
                        const seriesY = p1.y + (p2.y - p1.y) * progress;
                        const normalizedY = seriesY / this.maxY;

                        if (Math.abs(y / this.maxY - normalizedY) < 0.02) {
                            return this.theme.applyColor('●', color);
                        } else if (this.config.area && y / this.maxY <= normalizedY) {
                            const intensity = Math.floor((1 - y / this.maxY) * 4);
                            const chars = [' ', '░', '▒', '▓', '█'];
                            return this.theme.applyColor(chars[intensity], color);
                        }
                    }
                }
            }
        }

        return ' ';
    }

    private getSeriesColor(index: number): string {
        const colors = ['primary', 'secondary', 'success', 'warning', 'error', 'info'];
        return colors[index % colors.length];
    }

    private renderLegend(): string {
        const theme = this.theme.getCurrentTheme();
        let legend = '';

        for (let i = 0; i < this.series.length; i++) {
            const series = this.series[i];
            const color = series.color ?? this.getSeriesColor(i);

            if (i > 0) legend += '  ';
            legend += this.theme.applyColor('●', color) + ' ' + series.name;
        }

        return legend;
    }

    private renderTooltip(): string {
        const theme = this.theme.getCurrentTheme();
        if (!this.hoveredPoint) return '';

        const series = this.series.find(s => s.name === this.hoveredPoint!.series);
        const color = series?.color ?? this.getSeriesColor(this.series.findIndex(s => s.name === this.hoveredPoint!.series));

        let tooltip = this.theme.applyColor('▲', color) + ' ';
        tooltip += this.hoveredPoint.series;
        tooltip += ': (' + this.hoveredPoint.point.x + ', ' + this.hoveredPoint.point.y + ')';

        return tooltip;
    }
}