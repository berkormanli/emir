import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface ScatterPoint {
    x: number;
    y: number;
    value?: number;
    label?: string;
}

export interface ScatterSeries {
    name: string;
    data: ScatterPoint[];
    color?: string;
    pointShape?: 'circle' | 'square' | 'triangle' | 'diamond';
}

export interface RegressionLine {
    slope: number;
    intercept: number;
    r2?: number;
    color?: string;
    dashed?: boolean;
}

export interface ScatterChartConfig {
    showGrid?: boolean;
    showXAxis?: boolean;
    showYAxis?: boolean;
    showLegend?: boolean;
    xLabel?: string;
    yLabel?: string;
    showRegression?: boolean;
    enableZoom?: boolean;
    enablePan?: boolean;
    padding?: number;
}

export class ScatterChart extends BaseComponent {
    private series: ScatterSeries[] = [];
    private regressionLines: Map<string, RegressionLine> = new Map();
    private config: Required<ScatterChartConfig>;
    private theme: ThemeManager;
    private minX = 0;
    private maxX = 100;
    private minY = 0;
    private maxY = 100;
    private hoveredPoint: { series: string; point: ScatterPoint } | null = null;
    private zoom = 1;
    private panX = 0;
    private panY = 0;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: ScatterChartConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            showGrid: config.showGrid ?? true,
            showXAxis: config.showXAxis ?? true,
            showYAxis: config.showYAxis ?? true,
            showLegend: config.showLegend ?? true,
            xLabel: config.xLabel ?? '',
            yLabel: config.yLabel ?? '',
            showRegression: config.showRegression ?? false,
            enableZoom: config.enableZoom ?? false,
            enablePan: config.enablePan ?? false,
            padding: config.padding ?? 3
        };
        this.theme = ThemeManager.getInstance();
    }

    addSeries(series: ScatterSeries): void {
        this.series.push(series);
        this.updateBounds();
        if (this.config.showRegression) {
            this.calculateRegression(series);
        }
        this.markDirty();
    }

    removeSeries(seriesName: string): void {
        this.series = this.series.filter(s => s.name !== seriesName);
        this.regressionLines.delete(seriesName);
        this.updateBounds();
        this.markDirty();
    }

    updateSeries(seriesName: string, data: ScatterPoint[]): void {
        const series = this.series.find(s => s.name === seriesName);
        if (series) {
            series.data = data;
            this.updateBounds();
            if (this.config.showRegression) {
                this.calculateRegression(series);
            }
            this.markDirty();
        }
    }

    addPoint(seriesName: string, point: ScatterPoint): void {
        const series = this.series.find(s => s.name === seriesName);
        if (series) {
            series.data.push(point);
            this.updateBounds();
            if (this.config.showRegression) {
                this.calculateRegression(series);
            }
            this.markDirty();
        }
    }

    clearAllSeries(): void {
        for (const series of this.series) {
            series.data = [];
        }
        this.regressionLines.clear();
        this.markDirty();
    }

    private updateBounds(): void {
        if (this.series.length === 0) {
            this.minX = 0;
            this.maxX = 100;
            this.minY = 0;
            this.maxY = 100;
            return;
        }

        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const series of this.series) {
            for (const point of series.data) {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
            }
        }

        const padding = (maxX - minX) * 0.1;
        this.minX = minX - padding;
        this.maxX = maxX + padding;
        this.minY = minY - padding;
        this.maxY = maxY + padding;
    }

    private calculateRegression(series: ScatterSeries): void {
        const points = series.data.filter(p => typeof p.x === 'number' && typeof p.y === 'number');
        if (points.length < 2) return;

        const n = points.length;
        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumX2 = 0;
        let sumY2 = 0;

        for (const point of points) {
            sumX += point.x;
            sumY += point.y;
            sumXY += point.x * point.y;
            sumX2 += point.x * point.x;
            sumY2 += point.y * point.y;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        let ssTotal = 0;
        let ssResidual = 0;

        for (const point of points) {
            const predicted = slope * point.x + intercept;
            ssTotal += Math.pow(point.y - sumY / n, 2);
            ssResidual += Math.pow(point.y - predicted, 2);
        }

        const r2 = 1 - (ssResidual / ssTotal);

        this.regressionLines.set(series.name, {
            slope,
            intercept,
            r2,
            color: series.color,
            dashed: false
        });
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            return this.handleKeyInput(input);
        } else if (input.type === 'mouse') {
            return this.handleMouseInput(input);
        }
        return false;
    }

    private handleKeyInput(input: InputEvent): boolean {
        if (!this.config.enableZoom && !this.config.enablePan) return false;

        switch (input.key) {
            case '+':
            case '=':
                if (this.config.enableZoom) {
                    this.zoom = Math.min(this.zoom * 1.2, 10);
                    this.markDirty();
                    return true;
                }
                break;

            case '-':
            case '_':
                if (this.config.enableZoom) {
                    this.zoom = Math.max(this.zoom / 1.2, 0.1);
                    this.markDirty();
                    return true;
                }
                break;

            case 'r':
            case 'R':
                this.zoom = 1;
                this.panX = 0;
                this.panY = 0;
                this.markDirty();
                return true;

            case 'left':
            case 'ArrowLeft':
            case 'right':
            case 'ArrowRight':
            case 'up':
            case 'ArrowUp':
            case 'down':
            case 'ArrowDown':
                if (this.config.enablePan) {
                    const panSpeed = 10 / this.zoom;
                    switch (input.key) {
                        case 'left':
                        case 'ArrowLeft':
                            this.panX -= panSpeed;
                            break;
                        case 'right':
                        case 'ArrowRight':
                            this.panX += panSpeed;
                            break;
                        case 'up':
                        case 'ArrowUp':
                            this.panY += panSpeed;
                            break;
                        case 'down':
                        case 'ArrowDown':
                            this.panY -= panSpeed;
                            break;
                    }
                    this.markDirty();
                    return true;
                }
                break;
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

        const dataPoint = this.screenToData(x - chartArea.x, y - chartArea.y, chartArea.width, chartArea.height);
        this.hoveredPoint = this.findNearestPoint(dataPoint.x, dataPoint.y);
        this.markDirty();

        return true;
    }

    private screenToData(screenX: number, screenY: number, width: number, height: number): { x: number; y: number } {
        const relativeX = screenX / width;
        const relativeY = 1 - (screenY / height);

        const dataWidth = (this.maxX - this.minX) / this.zoom;
        const dataHeight = (this.maxY - this.minY) / this.zoom;

        const centerX = (this.minX + this.maxX) / 2 + this.panX;
        const centerY = (this.minY + this.maxY) / 2 + this.panY;

        return {
            x: centerX - dataWidth / 2 + relativeX * dataWidth,
            y: centerY - dataHeight / 2 + relativeY * dataHeight
        };
    }

    private findNearestPoint(x: number, y: number): { series: string; point: ScatterPoint } | null {
        let nearest: { series: string; point: ScatterPoint; distance: number } | null = null;
        const threshold = Math.max((this.maxX - this.minX) / this.zoom * 0.02,
                                   (this.maxY - this.minY) / this.zoom * 0.02);

        for (const series of this.series) {
            for (const point of series.data) {
                const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                if (distance < threshold && (!nearest || distance < nearest.distance)) {
                    nearest = { series: series.name, point, distance };
                }
            }
        }

        return nearest;
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const chartArea = {
            x: this.config.padding,
            y: this.config.padding,
            width: this.size.width - this.config.padding * 2,
            height: this.size.height - this.config.padding * 2
        };

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
                    const char = this.getChartCharacter(
                        x - this.config.padding,
                        y - this.config.padding,
                        chartArea.width,
                        chartArea.height
                    );
                    line += char;
                }
            }

            lines.push(line);
        }

        if (this.config.showLegend && this.series.length > 0) {
            lines.push('');
            lines.push(this.renderLegend());
        }

        if (this.hoveredPoint) {
            lines.push('');
            lines.push(this.renderTooltip());
        }

        return lines.join('\n');
    }

    private shouldDrawGridLine(x: number, y: number): boolean {
        if (!this.config.showGrid) return false;

        const gridInterval = 4;
        return (x % gridInterval === 0 && y >= this.config.padding && y < this.size.height - this.config.padding) ||
               (y % gridInterval === 0 && x >= this.config.padding && x < this.size.width - this.config.padding);
    }

    private shouldDrawAxis(x: number, y: number): boolean {
        return (x === this.config.padding && y >= this.config.padding && y < this.size.height - this.config.padding) ||
               (y === this.size.height - this.config.padding && x >= this.config.padding && x < this.size.width - this.config.padding);
    }

    private getChartCharacter(screenX: number, screenY: number, width: number, height: number): string {
        const theme = this.theme.getCurrentTheme();
        const dataPoint = this.screenToData(screenX, screenY, width, height);

        if (this.config.showRegression) {
            for (const [seriesName, regression] of this.regressionLines) {
                const y = regression.slope * dataPoint.x + regression.intercept;
                const distance = Math.abs(y - dataPoint.y) / this.zoom;
                const threshold = (this.maxY - this.minY) * 0.01;

                if (distance < threshold) {
                    const color = regression.color ?? this.getSeriesColor(this.series.findIndex(s => s.name === seriesName));
                    const char = regression.dashed && (Math.floor(screenX) % 4 < 2) ? '·' : '─';
                    return this.theme.applyColor(char, color);
                }
            }
        }

        const nearest = this.findNearestPoint(dataPoint.x, dataPoint.y);
        if (nearest) {
            const series = this.series.find(s => s.name === nearest.series);
            const color = series?.color ?? this.getSeriesColor(this.series.findIndex(s => s.name === nearest.series));
            const shape = series?.pointShape ?? 'circle';
            const char = this.getPointChar(shape);
            return this.theme.applyColor(char, color);
        }

        return ' ';
    }

    private getPointChar(shape: string): string {
        switch (shape) {
            case 'circle': return '●';
            case 'square': return '■';
            case 'triangle': return '▲';
            case 'diamond': return '◆';
            default: return '●';
        }
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
            const shape = series.pointShape ?? 'circle';
            const char = this.getPointChar(shape);

            if (i > 0) legend += '  ';
            legend += this.theme.applyColor(char, color) + ' ' + series.name;

            const regression = this.regressionLines.get(series.name);
            if (regression && regression.r2 !== undefined) {
                legend += ` (R²=${regression.r2.toFixed(3)})`;
            }
        }

        return legend;
    }

    private renderTooltip(): string {
        const theme = this.theme.getCurrentTheme();
        if (!this.hoveredPoint) return '';

        const series = this.series.find(s => s.name === this.hoveredPoint!.series);
        const color = series?.color ?? this.getSeriesColor(this.series.findIndex(s => s.name === this.hoveredPoint!.series));

        let tooltip = this.theme.applyColor('●', color) + ' ';
        tooltip += this.hoveredPoint.series;
        tooltip += ': (' + this.hoveredPoint.point.x.toFixed(2) + ', ' + this.hoveredPoint.point.y.toFixed(2) + ')';

        if (this.hoveredPoint.point.label) {
            tooltip += ' - ' + this.hoveredPoint.point.label;
        }

        if (this.hoveredPoint.point.value !== undefined) {
            tooltip += ' [value: ' + this.hoveredPoint.point.value.toFixed(2) + ']';
        }

        return tooltip;
    }
}