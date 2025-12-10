import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface StreamDataPoint {
    timestamp: number;
    value: number;
    label?: string;
}

export interface StreamConfig {
    bufferSize?: number;
    updateInterval?: number;
    autoScroll?: boolean;
    showGrid?: boolean;
    showYAxis?: boolean;
    showTimeAxis?: boolean;
    timeWindow?: number;
    minValue?: number;
    maxValue?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    fillArea?: boolean;
    showStats?: boolean;
    smooth?: boolean;
}

export interface StreamStats {
    current: number;
    average: number;
    min: number;
    max: number;
    count: number;
}

export class StreamingChart extends BaseComponent {
    private buffer: StreamDataPoint[] = [];
    private config: Required<StreamConfig>;
    private theme: ThemeManager;
    private lastUpdate = 0;
    private updateTimer: NodeJS.Timeout | null = null;
    private stats: StreamStats = { current: 0, average: 0, min: 0, max: 0, count: 0 };
    private onDataCallback?: (point: StreamDataPoint) => void;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: StreamConfig = {},
        onData?: (point: StreamDataPoint) => void
    ) {
        super(id, position, size);
        this.config = {
            bufferSize: config.bufferSize ?? 100,
            updateInterval: config.updateInterval ?? 1000,
            autoScroll: config.autoScroll ?? true,
            showGrid: config.showGrid ?? true,
            showYAxis: config.showYAxis ?? true,
            showTimeAxis: config.showTimeAxis ?? true,
            timeWindow: config.timeWindow ?? 60000,
            minValue: config.minValue,
            maxValue: config.maxValue,
            lineStyle: config.lineStyle ?? 'solid',
            fillArea: config.fillArea ?? false,
            showStats: config.showStats ?? true,
            smooth: config.smooth ?? false
        };
        this.theme = ThemeManager.getInstance();
        this.onDataCallback = onData;
        this.startStreaming();
    }

    addDataPoint(value: number, label?: string): void {
        const point: StreamDataPoint = {
            timestamp: Date.now(),
            value,
            label
        };

        this.buffer.push(point);

        if (this.config.timeWindow) {
            const cutoff = Date.now() - this.config.timeWindow;
            this.buffer = this.buffer.filter(p => p.timestamp > cutoff);
        } else if (this.buffer.length > this.config.bufferSize) {
            this.buffer = this.buffer.slice(-this.config.bufferSize);
        }

        this.updateStats();
        this.markDirty();

        if (this.onDataCallback) {
            this.onDataCallback(point);
        }
    }

    setConfig(updates: Partial<StreamConfig>): void {
        Object.assign(this.config, updates);
        this.markDirty();
    }

    clearBuffer(): void {
        this.buffer = [];
        this.stats = { current: 0, average: 0, min: 0, max: 0, count: 0 };
        this.markDirty();
    }

    getStats(): StreamStats {
        return { ...this.stats };
    }

    getLatestValue(): number | null {
        return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1].value : null;
    }

    private updateStats(): void {
        if (this.buffer.length === 0) return;

        this.stats.current = this.buffer[this.buffer.length - 1].value;
        this.stats.count = this.buffer.length;

        let sum = 0;
        let min = Infinity;
        let max = -Infinity;

        for (const point of this.buffer) {
            sum += point.value;
            min = Math.min(min, point.value);
            max = Math.max(max, point.value);
        }

        this.stats.average = sum / this.buffer.length;
        this.stats.min = min;
        this.stats.max = max;
    }

    private startStreaming(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }

        this.updateTimer = setInterval(() => {
            this.lastUpdate = Date.now();
            this.markDirty();
        }, this.config.updateInterval);
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'c':
                case 'C':
                    if (input.ctrl) {
                        this.clearBuffer();
                        return true;
                    }
                    break;

                case 's':
                case 'S':
                    if (input.ctrl) {
                        this.config.autoScroll = !this.config.autoScroll;
                        this.markDirty();
                        return true;
                    }
                    break;

                case 'f':
                case 'F':
                    if (input.ctrl) {
                        this.config.fillArea = !this.config.fillArea;
                        this.markDirty();
                        return true;
                    }
                    break;

                case 'p':
                case 'P':
                    if (input.ctrl) {
                        this.config.smooth = !this.config.smooth;
                        this.markDirty();
                        return true;
                    }
                    break;
            }
        }

        return false;
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        if (this.buffer.length === 0) {
            lines.push(theme.applyColor('No data available', 'muted'));
            return lines.join('\n');
        }

        const chartHeight = this.size.height - (this.config.showStats ? 3 : 0) - 2;
        const chartWidth = this.size.width - (this.config.showYAxis ? 4 : 0) - 1;

        const minValue = this.config.minValue ?? this.stats.min;
        const maxValue = this.config.maxValue ?? this.stats.max;
        const valueRange = maxValue - minValue || 1;

        for (let y = 0; y < chartHeight; y++) {
            let line = '';

            if (this.config.showYAxis) {
                const value = maxValue - (y / chartHeight) * valueRange;
                const tickLabel = value.toFixed(0).padStart(4);
                line += theme.applyColor(tickLabel, 'textSecondary') + ' ';
            }

            for (let x = 0; x < chartWidth; x++) {
                const char = this.getChartCharacter(x, y, chartWidth, chartHeight, minValue, valueRange);
                line += char;
            }

            if (this.config.showGrid && y % Math.floor(chartHeight / 5) === 0) {
                line = theme.applyColor(line, 'muted');
            }

            lines.push(line);
        }

        if (this.config.showTimeAxis) {
            const axisLine = theme.applyColor('─'.repeat(this.size.width - (this.config.showYAxis ? 5 : 0)), 'border');
            lines.push((this.config.showYAxis ? '     ' : '') + axisLine);
        }

        if (this.config.showStats) {
            lines.push('');
            const statsLine = `Current: ${this.stats.current.toFixed(2)} | ` +
                             `Avg: ${this.stats.average.toFixed(2)} | ` +
                             `Min: ${this.stats.min.toFixed(2)} | ` +
                             `Max: ${this.stats.max.toFixed(2)} | ` +
                             `Points: ${this.stats.count}`;
            lines.push(theme.applyColor(statsLine, 'textSecondary'));

            const statusLine = `Auto-scroll: ${this.config.autoScroll ? 'ON' : 'OFF'} | ` +
                              `Fill: ${this.config.fillArea ? 'ON' : 'OFF'} | ` +
                              `Smooth: ${this.config.smooth ? 'ON' : 'OFF'} | ` +
                              `Buffer: ${this.buffer.length}/${this.config.bufferSize}`;
            lines.push(theme.applyColor(statusLine, 'muted'));
        }

        return lines.join('\n');
    }

    private getChartCharacter(x: number, y: number, width: number, height: number,
                             minValue: number, valueRange: number): string {
        const theme = this.theme.getCurrentTheme();

        if (this.buffer.length < 2) {
            return ' ';
        }

        const oldestTimestamp = this.buffer[0].timestamp;
        const newestTimestamp = this.buffer[this.buffer.length - 1].timestamp;
        const timestampRange = newestTimestamp - oldestTimestamp || 1;

        const targetTimestamp = oldestTimestamp + (x / width) * timestampRange;
        const targetValue = minValue + (1 - y / height) * valueRange;

        let interpolatedValue: number;

        if (this.config.smooth) {
            interpolatedValue = this.interpolateValue(targetTimestamp);
        } else {
            interpolatedValue = this.getNearestValue(targetTimestamp);
        }

        if (interpolatedValue === null) {
            return ' ';
        }

        const isInValueRange = Math.abs(interpolatedValue - targetValue) < valueRange * 0.02;

        if (isInValueRange) {
            const percentThroughBuffer = (targetTimestamp - oldestTimestamp) / timestampRange;
            const color = this.getValueColor(percentThroughBuffer);

            if (this.config.lineStyle === 'dashed' && Math.floor(x) % 4 < 2) {
                return ' ';
            } else if (this.config.lineStyle === 'dotted' && Math.floor(x) % 2 === 0) {
                return ' ';
            }

            const char = this.config.fillArea && y > height - 2 ? '█' : '●';
            return theme.applyColor(char, color);
        }

        if (this.config.fillArea && interpolatedValue > targetValue) {
            const percentThroughBuffer = (targetTimestamp - oldestTimestamp) / timestampRange;
            const color = this.getValueColor(percentThroughBuffer);
            const intensity = Math.floor((interpolatedValue - targetValue) / valueRange * 3);
            const chars = [' ', '░', '▒', '▓'];
            return theme.applyColor(chars[Math.min(intensity, 3)], color);
        }

        return ' ';
    }

    private getNearestValue(timestamp: number): number | null {
        let nearest: StreamDataPoint | null = null;
        let minDistance = Infinity;

        for (const point of this.buffer) {
            const distance = Math.abs(point.timestamp - timestamp);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = point;
            }
        }

        const maxDistance = (this.buffer[this.buffer.length - 1].timestamp - this.buffer[0].timestamp) / this.size.width;
        return minDistance <= maxDistance ? nearest?.value ?? null : null;
    }

    private interpolateValue(timestamp: number): number | null {
        if (this.buffer.length < 2) return null;

        for (let i = 0; i < this.buffer.length - 1; i++) {
            const p1 = this.buffer[i];
            const p2 = this.buffer[i + 1];

            if (timestamp >= p1.timestamp && timestamp <= p2.timestamp) {
                const progress = (timestamp - p1.timestamp) / (p2.timestamp - p1.timestamp);
                return p1.value + (p2.value - p1.value) * progress;
            }
        }

        return null;
    }

    private getValueColor(progress: number): string {
        if (progress < 0.25) return 'info';
        if (progress < 0.5) return 'success';
        if (progress < 0.75) return 'warning';
        return 'error';
    }

    destroy(): void {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        super.destroy();
    }
}