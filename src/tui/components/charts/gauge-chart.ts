import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface GaugeZone {
    from: number;
    to: number;
    color: string;
    label?: string;
}

export interface GaugeChartConfig {
    min?: number;
    max?: number;
    value?: number;
    zones?: GaugeZone[];
    showValue?: boolean;
    showLabels?: boolean;
    showTicks?: boolean;
    tickCount?: number;
    label?: string;
    unit?: string;
    orientation?: 'horizontal' | 'vertical' | 'circular';
    size?: 'small' | 'medium' | 'large';
    animate?: boolean;
    threshold?: { value: number; color: string };
}

export class GaugeChart extends BaseComponent {
    private config: Required<GaugeChartConfig>;
    private theme: ThemeManager;
    private currentValue = 0;
    private targetValue = 0;
    private animationProgress = 0;
    private lastUpdate = Date.now();

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: GaugeChartConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            min: config.min ?? 0,
            max: config.max ?? 100,
            value: config.value ?? 0,
            zones: config.zones ?? this.createDefaultZones(),
            showValue: config.showValue ?? true,
            showLabels: config.showLabels ?? true,
            showTicks: config.showTicks ?? true,
            tickCount: config.tickCount ?? 10,
            label: config.label ?? '',
            unit: config.unit ?? '',
            orientation: config.orientation ?? 'horizontal',
            size: config.size ?? 'medium',
            animate: config.animate ?? true,
            threshold: config.threshold
        };
        this.theme = ThemeManager.getInstance();
        this.targetValue = this.config.value;
    }

    setValue(value: number): void {
        this.targetValue = Math.max(this.config.min, Math.min(this.config.max, value));
        if (this.config.animate) {
            this.lastUpdate = Date.now();
        } else {
            this.currentValue = this.targetValue;
            this.animationProgress = 1;
        }
        this.markDirty();
    }

    getValue(): number {
        return this.currentValue;
    }

    setZones(zones: GaugeZone[]): void {
        this.config.zones = zones;
        this.markDirty();
    }

    setThreshold(threshold: { value: number; color: string }): void {
        this.config.threshold = threshold;
        this.markDirty();
    }

    private createDefaultZones(): GaugeZone[] {
        return [
            { from: 0, to: 30, color: 'success', label: 'Good' },
            { from: 30, to: 70, color: 'warning', label: 'Warning' },
            { from: 70, to: 100, color: 'error', label: 'Critical' }
        ];
    }

    private updateAnimation(): void {
        if (!this.config.animate || this.animationProgress >= 1) return;

        const now = Date.now();
        const deltaTime = now - this.lastUpdate;
        this.lastUpdate = now;

        const animationDuration = 500;
        this.animationProgress = Math.min(1, this.animationProgress + deltaTime / animationDuration);

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easedProgress = easeOutCubic(this.animationProgress);

        this.currentValue = this.config.min + (this.targetValue - this.config.min) * easedProgress;
    }

    handleInput(input: InputEvent): boolean {
        return false;
    }

    render(): string {
        this.updateAnimation();

        switch (this.config.orientation) {
            case 'circular':
                return this.renderCircularGauge();
            case 'vertical':
                return this.renderVerticalGauge();
            default:
                return this.renderHorizontalGauge();
        }
    }

    private renderHorizontalGauge(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const gaugeWidth = this.size.width - 4;
        const valueWidth = Math.round((this.currentValue - this.config.min) /
                                     (this.config.max - this.config.min) * gaugeWidth);

        if (this.config.label) {
            lines.push(this.theme.applyTypography(this.config.label, 'heading'));
            lines.push('');
        }

        let gaugeLine = '';

        for (let x = 0; x < gaugeWidth; x++) {
            const value = this.config.min + (x / gaugeWidth) * (this.config.max - this.config.min);
            const zone = this.getZoneForValue(value);
            const isInValueRange = x < valueWidth;

            let char = '█';
            if (isInValueRange) {
                const thresholdColor = this.config.threshold && value >= this.config.threshold.value
                    ? this.config.threshold.color
                    : zone.color;
                char = this.theme.applyColor(char, thresholdColor);
            } else {
                char = this.theme.applyColor(char, 'muted');
            }

            gaugeLine += char;

            if (this.config.showTicks && x % Math.floor(gaugeWidth / this.config.tickCount) === 0) {
                gaugeLine += '|';
            }
        }

        lines.push(gaugeLine);

        if (this.config.showLabels) {
            let labelsLine = '';
            const labelStep = gaugeWidth / this.config.zones.length;

            for (let i = 0; i < this.config.zones.length; i++) {
                const zone = this.config.zones[i];
                const label = zone.label || '';
                const startPos = Math.round(i * labelStep);
                const endPos = Math.round((i + 1) * labelStep);
                const availableWidth = endPos - startPos;

                if (label && availableWidth > label.length) {
                    const padding = Math.floor((availableWidth - label.length) / 2);
                    labelsLine += ' '.repeat(padding) +
                                  this.theme.applyColor(label, zone.color) +
                                  ' '.repeat(availableWidth - label.length - padding);
                } else {
                    labelsLine += ' '.repeat(availableWidth);
                }
            }

            lines.push(labelsLine);
        }

        if (this.config.showValue) {
            const valueText = `Value: ${this.currentValue.toFixed(1)}${this.config.unit ? ' ' + this.config.unit : ''}`;
            const valueLine = this.theme.applyColor(valueText, 'textPrimary');
            lines.push('');
            lines.push(valueLine);
        }

        if (this.config.threshold) {
            const thresholdText = `Threshold: ${this.config.threshold.value}${this.config.unit ? ' ' + this.config.unit : ''}`;
            const thresholdLine = this.theme.applyColor(thresholdText, this.config.threshold.color);
            lines.push(thresholdLine);
        }

        return lines.join('\n');
    }

    private renderVerticalGauge(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const gaugeHeight = this.size.height - 4;
        const valueHeight = Math.round((this.currentValue - this.config.min) /
                                      (this.config.max - this.config.min) * gaugeHeight);

        for (let y = 0; y < gaugeHeight; y++) {
            const value = this.config.max - (y / gaugeHeight) * (this.config.max - this.config.min);
            const zone = this.getZoneForValue(value);
            const isInValueRange = y >= (gaugeHeight - valueHeight);

            let char = '│';
            if (isInValueRange) {
                const thresholdColor = this.config.threshold && value <= this.config.threshold.value
                    ? this.config.threshold.color
                    : zone.color;
                char = this.theme.applyColor('█', thresholdColor);
            } else {
                char = this.theme.applyColor('│', 'muted');
            }

            let line = char;

            if (this.config.showTicks && y % Math.floor(gaugeHeight / this.config.tickCount) === 0) {
                const tickValue = this.config.min + (1 - y / gaugeHeight) * (this.config.max - this.config.min);
                const tickLabel = tickValue.toFixed(0).padStart(4);
                line = tickLabel + ' ' + char;
            }

            lines.push(line);
        }

        if (this.config.showValue) {
            const valueText = `${this.currentValue.toFixed(1)}${this.config.unit ? ' ' + this.config.unit : ''}`;
            const valueLine = this.theme.applyColor(valueText, 'textPrimary');
            lines.push('');
            lines.push(valueLine);
        }

        return lines.join('\n');
    }

    private renderCircularGauge(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const radius = Math.min(Math.floor(this.size.width / 2) - 1, Math.floor(this.size.height / 2) - 1);
        const centerX = Math.floor(this.size.width / 2);
        const centerY = Math.floor(this.size.height / 2);

        const value = (this.currentValue - this.config.min) / (this.config.max - this.config.min);
        const angle = value * 270 - 135;

        for (let y = 0; y < this.size.height; y++) {
            let line = '';

            for (let x = 0; x < this.size.width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (Math.abs(distance - radius) < 0.5) {
                    let pointAngle = Math.atan2(dy, dx) * 180 / Math.PI;
                    pointAngle = (pointAngle + 135 + 360) % 360;

                    const zone = this.getZoneForValue(this.config.min + (pointAngle / 270) * (this.config.max - this.config.min));
                    const isInValueRange = pointAngle <= (value * 270);

                    let char = '●';
                    if (isInValueRange) {
                        const thresholdColor = this.config.threshold &&
                                            this.currentValue >= this.config.threshold.value
                            ? this.config.threshold.color
                            : zone.color;
                        char = this.theme.applyColor(char, thresholdColor);
                    } else {
                        char = this.theme.applyColor(char, 'muted');
                    }

                    line += char;
                } else if (distance < radius - 1) {
                    if (this.config.showValue && y === centerY) {
                        const valueText = `${this.currentValue.toFixed(0)}${this.config.unit || ''}`;
                        const textX = centerX - Math.floor(valueText.length / 2);
                        if (x >= textX && x < textX + valueText.length) {
                            const charIndex = x - textX;
                            line += this.theme.applyColor(valueText[charIndex], 'textPrimary');
                        } else {
                            line += ' ';
                        }
                    } else {
                        line += ' ';
                    }
                } else {
                    line += ' ';
                }
            }

            lines.push(line);
        }

        if (this.config.label && !this.config.showValue) {
            const labelLine = this.theme.applyTypography(this.config.label, 'heading');
            const paddedLabel = labelLine.padStart(centerX - Math.floor(this.config.label.length / 2));
            lines[centerY] = lines[centerY].substring(0, centerX - Math.floor(this.config.label.length / 2)) +
                             paddedLabel +
                             lines[centerY].substring(centerX + Math.floor(this.config.label.length / 2));
        }

        return lines.join('\n');
    }

    private getZoneForValue(value: number): GaugeZone {
        for (const zone of this.config.zones) {
            if (value >= zone.from && value <= zone.to) {
                return zone;
            }
        }
        return this.config.zones[this.config.zones.length - 1];
    }
}