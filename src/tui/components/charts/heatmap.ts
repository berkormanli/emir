import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface HeatmapDataPoint {
    x: number;
    y: number;
    value: number;
    label?: string;
}

export interface ColorScale {
    min: number;
    max: number;
    colors: { value: number; color: string; label?: string }[];
}

export interface HeatmapConfig {
    showGrid?: boolean;
    showScale?: boolean;
    scalePosition?: 'right' | 'bottom' | 'left' | 'top';
    scaleLabels?: boolean;
    cellWidth?: number;
    cellHeight?: number;
    interpolation?: 'nearest' | 'linear' | 'cubic';
    showValues?: boolean;
    showCoordinates?: boolean;
    colorScale?: ColorScale;
}

export class Heatmap extends BaseComponent {
    private data: HeatmapDataPoint[] = [];
    private config: Required<HeatmapConfig>;
    private theme: ThemeManager;
    private minX = 0;
    private maxX = 10;
    private minY = 0;
    private maxY = 10;
    private minValue = 0;
    private maxValue = 100;
    private hoveredCell: { x: number; y: number; value: number } | null = null;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: HeatmapConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            showGrid: config.showGrid ?? true,
            showScale: config.scaleLabels ?? true,
            scalePosition: config.scalePosition ?? 'right',
            scaleLabels: config.scaleLabels ?? true,
            cellWidth: config.cellWidth ?? 3,
            cellHeight: config.cellHeight ?? 1,
            interpolation: config.interpolation ?? 'nearest',
            showValues: config.showValues ?? false,
            showCoordinates: config.showCoordinates ?? false,
            colorScale: config.colorScale ?? this.createDefaultColorScale()
        };
        this.theme = ThemeManager.getInstance();
    }

    setData(data: HeatmapDataPoint[]): void {
        this.data = data;
        this.updateBounds();
        this.markDirty();
    }

    addDataPoint(point: HeatmapDataPoint): void {
        this.data.push(point);
        this.updateBounds();
        this.markDirty();
    }

    clearData(): void {
        this.data = [];
        this.markDirty();
    }

    setCustomColorScale(colorScale: ColorScale): void {
        this.config.colorScale = colorScale;
        this.markDirty();
    }

    private updateBounds(): void {
        if (this.data.length === 0) return;

        this.minX = Math.min(...this.data.map(p => p.x));
        this.maxX = Math.max(...this.data.map(p => p.x));
        this.minY = Math.min(...this.data.map(p => p.y));
        this.maxY = Math.max(...this.data.map(p => p.y));
        this.minValue = Math.min(...this.data.map(p => p.value));
        this.maxValue = Math.max(...this.data.map(p => p.value));
    }

    private createDefaultColorScale(): ColorScale {
        return {
            min: 0,
            max: 100,
            colors: [
                { value: 0, color: 'info', label: 'Low' },
                { value: 25, color: 'success', label: 'Medium-Low' },
                { value: 50, color: 'warning', label: 'Medium' },
                { value: 75, color: 'error', label: 'Medium-High' },
                { value: 100, color: 'error', label: 'High' }
            ]
        };
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

        const cellX = Math.floor(x / this.config.cellWidth);
        const cellY = Math.floor(y / this.config.cellHeight);

        if (cellX >= 0 && cellX < (this.maxX - this.minX + 1) &&
            cellY >= 0 && cellY < (this.maxY - this.minY + 1)) {
            const value = this.getValueAt(cellX + this.minX, cellY + this.minY);
            this.hoveredCell = { x: cellX + this.minX, y: cellY + this.minY, value };
        } else {
            this.hoveredCell = null;
        }

        this.markDirty();
        return true;
    }

    private getValueAt(x: number, y: number): number {
        const point = this.data.find(p => p.x === x && p.y === y);
        if (point) return point.value;

        if (this.config.interpolation === 'nearest') {
            return this.interpolateNearest(x, y);
        } else if (this.config.interpolation === 'linear') {
            return this.interpolateLinear(x, y);
        } else {
            return this.interpolateNearest(x, y);
        }
    }

    private interpolateNearest(x: number, y: number): number {
        let minDistance = Infinity;
        let nearestValue = 0;

        for (const point of this.data) {
            const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearestValue = point.value;
            }
        }

        return nearestValue;
    }

    private interpolateLinear(x: number, y: number): number {
        const radius = 2;
        let totalWeight = 0;
        let weightedSum = 0;

        for (const point of this.data) {
            const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
            if (distance <= radius) {
                const weight = 1 - (distance / radius);
                weightedSum += point.value * weight;
                totalWeight += weight;
            }
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    private getColorForValue(value: number): string {
        const normalizedValue = (value - this.minValue) / (this.maxValue - this.minValue);
        const scale = this.config.colorScale;

        for (let i = 0; i < scale.colors.length - 1; i++) {
            const color1 = scale.colors[i];
            const color2 = scale.colors[i + 1];

            const normalizedColor1 = (color1.value - scale.min) / (scale.max - scale.min);
            const normalizedColor2 = (color2.value - scale.min) / (scale.max - scale.min);

            if (normalizedValue >= normalizedColor1 && normalizedValue <= normalizedColor2) {
                const localProgress = (normalizedValue - normalizedColor1) / (normalizedColor2 - normalizedColor1);
                return localProgress < 0.5 ? color1.color : color2.color;
            }
        }

        return scale.colors[scale.colors.length - 1].color;
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const chartWidth = (this.maxX - this.minX + 1) * this.config.cellWidth;
        const chartHeight = (this.maxY - this.minY + 1) * this.config.cellHeight;
        const scaleWidth = this.config.showScale ? 3 : 0;

        for (let y = 0; y < this.size.height; y++) {
            let line = '';

            for (let x = 0; x < chartWidth; x++) {
                const cellX = Math.floor(x / this.config.cellWidth);
                const cellY = Math.floor(y / this.config.cellHeight);

                if (cellX >= 0 && cellX < (this.maxX - this.minX + 1) &&
                    cellY >= 0 && cellY < (this.maxY - this.minY + 1)) {
                    const value = this.getValueAt(cellX + this.minX, cellY + this.minY);
                    const color = this.getColorForValue(value);
                    let char = '█';

                    if (this.config.showValues && this.config.cellWidth > 2) {
                        const displayValue = Math.round(value);
                        if (x % this.config.cellWidth === 1 && this.config.cellWidth >= 3) {
                            char = String(displayValue).padStart(this.config.cellWidth, ' ')[0];
                        }
                    }

                    if (this.hoveredCell && this.hoveredCell.x === cellX + this.minX &&
                        this.hoveredCell.y === cellY + this.minY) {
                        char = '▓';
                    }

                    line += theme.applyColor(char, color);

                    if (this.config.showGrid && (x + 1) % this.config.cellWidth === 0 && x + 1 < chartWidth) {
                        line += theme.applyColor('│', 'border');
                    }
                } else {
                    line += ' ';
                }
            }

            if (this.config.showScale && scaleWidth > 0) {
                line += ' ' + this.renderScaleLine(y, chartHeight);
            }

            lines.push(line);
        }

        if (this.config.showCoordinates) {
            lines.push('');
            lines.push(this.renderCoordinateLabels());
        }

        if (this.hoveredCell) {
            lines.push('');
            lines.push(this.renderTooltip());
        }

        return lines.join('\n');
    }

    private renderScaleLine(y: number, chartHeight: number): string {
        const theme = this.theme.getCurrentTheme();
        const scaleLines = 10;
        const lineIndex = Math.floor((y / this.size.height) * scaleLines);
        const value = this.minValue + (this.maxValue - this.minValue) * (1 - lineIndex / scaleLines);
        const color = this.getColorForValue(value);
        const char = '█';

        let scaleLine = theme.applyColor(char, color);

        if (this.config.scaleLabels && y % Math.ceil(this.size.height / 5) === 0) {
            const label = Math.round(value).toString();
            scaleLine += ' ' + theme.applyColor(label.padStart(3), 'textSecondary');
        }

        return scaleLine.padEnd(4, ' ');
    }

    private renderCoordinateLabels(): string {
        const theme = this.theme.getCurrentTheme();
        let labels = '';

        if (this.config.cellWidth >= 3) {
            labels += 'X: ';
            for (let x = this.minX; x <= this.maxX; x++) {
                labels += String(x).padEnd(this.config.cellWidth, ' ');
            }
        }

        return theme.applyColor(labels, 'textSecondary');
    }

    private renderTooltip(): string {
        const theme = this.theme.getCurrentTheme();
        if (!this.hoveredCell) return '';

        const dataPoint = this.data.find(p => p.x === this.hoveredCell!.x && p.y === this.hoveredCell!.y);
        let tooltip = `(${this.hoveredCell.x}, ${this.hoveredCell.y}): ${this.hoveredCell.value.toFixed(2)}`;

        if (dataPoint && dataPoint.label) {
            tooltip += ' - ' + dataPoint.label;
        }

        return theme.applyColor(tooltip, 'textPrimary');
    }
}