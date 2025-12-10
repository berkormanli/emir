import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface ColorPickerConfig {
    format?: 'hex' | 'rgb' | 'hsl' | 'ansi';
    showPreview?: boolean;
    showPalette?: boolean;
    presetColors?: string[];
    allowCustomInput?: boolean;
    showAlpha?: boolean;
}

export interface ColorValue {
    r: number;
    g: number;
    b: number;
    a?: number;
}

export class ColorPicker extends BaseComponent {
    private selectedColor: ColorValue = { r: 0, g: 0, b: 0, a: 1 };
    private config: Required<ColorPickerConfig>;
    private theme: ThemeManager;
    private mode: 'palette' | 'sliders' | 'input' = 'palette';
    private selectedPresetIndex = 0;
    private currentSlider = 0;
    private inputText = '';

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: ColorPickerConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            format: config.format ?? 'hex',
            showPreview: config.showPreview ?? true,
            showPalette: config.showPalette ?? true,
            presetColors: config.presetColors ?? [
                '#FF0000', '#FF8000', '#FFFF00', '#80FF00',
                '#00FF00', '#00FF80', '#00FFFF', '#0080FF',
                '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
                '#FFFFFF', '#C0C0C0', '#808080', '#404040',
                '#000000'
            ],
            allowCustomInput: config.allowCustomInput ?? true,
            showAlpha: config.showAlpha ?? false
        };
        this.theme = ThemeManager.getInstance();
    }

    setColor(color: string | ColorValue): void {
        if (typeof color === 'string') {
            this.selectedColor = this.parseColor(color);
        } else {
            this.selectedColor = { ...color };
        }
        this.updateInputText();
        this.markDirty();
    }

    getColor(): ColorValue {
        return { ...this.selectedColor };
    }

    getColorString(): string {
        return this.formatColor(this.selectedColor);
    }

    private parseColor(color: string): ColorValue {
        color = color.trim().toLowerCase();

        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                return {
                    r: parseInt(hex[0] + hex[0], 16),
                    g: parseInt(hex[1] + hex[1], 16),
                    b: parseInt(hex[2] + hex[2], 16),
                    a: 1
                };
            } else if (hex.length === 6) {
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16),
                    a: 1
                };
            } else if (hex.length === 8) {
                return {
                    r: parseInt(hex.substring(0, 2), 16),
                    g: parseInt(hex.substring(2, 4), 16),
                    b: parseInt(hex.substring(4, 6), 16),
                    a: parseInt(hex.substring(6, 8), 16) / 255
                };
            }
        } else if (color.startsWith('rgb')) {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (match) {
                return {
                    r: parseInt(match[1]),
                    g: parseInt(match[2]),
                    b: parseInt(match[3]),
                    a: match[4] ? parseFloat(match[4]) : 1
                };
            }
        }

        return { r: 0, g: 0, b: 0, a: 1 };
    }

    private formatColor(color: ColorValue): string {
        switch (this.config.format) {
            case 'hex':
                const hex = '#' +
                    this.selectedColor.r.toString(16).padStart(2, '0') +
                    this.selectedColor.g.toString(16).padStart(2, '0') +
                    this.selectedColor.b.toString(16).padStart(2, '0');
                return this.config.showAlpha && color.a !== undefined
                    ? hex + Math.round(color.a * 255).toString(16).padStart(2, '0')
                    : hex;

            case 'rgb':
                return this.config.showAlpha && color.a !== undefined
                    ? `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a.toFixed(2)})`
                    : `rgb(${color.r}, ${color.g}, ${color.b})`;

            case 'hsl':
                const hsl = this.rgbToHsl(color.r, color.g, color.b);
                return this.config.showAlpha && color.a !== undefined
                    ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${color.a.toFixed(2)})`
                    : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

            case 'ansi':
                return this.rgbToAnsi(color.r, color.g, color.b);

            default:
                return '#' + color.r.toString(16).padStart(2, '0') +
                       color.g.toString(16).padStart(2, '0') +
                       color.b.toString(16).padStart(2, '0');
        }
    }

    private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    private rgbToAnsi(r: number, g: number, b: number): string {
        const ansiColors = [
            [0, 0, 0], [128, 0, 0], [0, 128, 0], [128, 128, 0],
            [0, 0, 128], [128, 0, 128], [0, 128, 128], [192, 192, 192],
            [128, 128, 128], [255, 0, 0], [0, 255, 0], [255, 255, 0],
            [0, 0, 255], [255, 0, 255], [0, 255, 255], [255, 255, 255]
        ];

        let minDistance = Infinity;
        let closestIndex = 0;

        for (let i = 0; i < ansiColors.length; i++) {
            const [ar, ag, ab] = ansiColors[i];
            const distance = Math.sqrt(
                Math.pow(r - ar, 2) +
                Math.pow(g - ag, 2) +
                Math.pow(b - ab, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = i;
            }
        }

        return `ansi-${closestIndex}`;
    }

    private updateInputText(): void {
        this.inputText = this.formatColor(this.selectedColor);
    }

    handleInput(input: InputEvent): boolean {
        switch (this.mode) {
            case 'palette':
                return this.handlePaletteInput(input);
            case 'sliders':
                return this.handleSlidersInput(input);
            case 'input':
                return this.handleColorInput(input);
        }
        return false;
    }

    private handlePaletteInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'left':
                case 'ArrowLeft':
                    this.selectedPresetIndex = Math.max(0, this.selectedPresetIndex - 1);
                    this.selectPresetColor();
                    return true;

                case 'right':
                case 'ArrowRight':
                    this.selectedPresetIndex = Math.min(
                        this.config.presetColors.length - 1,
                        this.selectedPresetIndex + 1
                    );
                    this.selectPresetColor();
                    return true;

                case 'up':
                case 'ArrowUp':
                    this.selectedPresetIndex = Math.max(0, this.selectedPresetIndex - 8);
                    this.selectPresetColor();
                    return true;

                case 'down':
                case 'ArrowDown':
                    this.selectedPresetIndex = Math.min(
                        this.config.presetColors.length - 1,
                        this.selectedPresetIndex + 8
                    );
                    this.selectPresetColor();
                    return true;

                case 'enter':
                case 'Return':
                case ' ':
                    this.selectPresetColor();
                    return true;

                case 'tab':
                    this.mode = 'sliders';
                    this.currentSlider = 0;
                    this.markDirty();
                    return true;

                case 'escape':
                    this.blur();
                    return true;
            }
        }

        return false;
    }

    private handleSlidersInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'left':
                case 'ArrowLeft':
                    this.adjustSlider(-1);
                    return true;

                case 'right':
                case 'ArrowRight':
                    this.adjustSlider(1);
                    return true;

                case 'up':
                case 'ArrowUp':
                    this.adjustSlider(5);
                    return true;

                case 'down':
                case 'ArrowDown':
                    this.adjustSlider(-5);
                    return true;

                case 'tab':
                    if (input.shift) {
                        this.currentSlider = Math.max(0, this.currentSlider - 1);
                    } else {
                        this.currentSlider = Math.min(this.config.showAlpha ? 3 : 2, this.currentSlider + 1);
                        if (this.currentSlider > (this.config.showAlpha ? 3 : 2)) {
                            this.mode = 'input';
                            this.currentSlider = 0;
                        }
                    }
                    this.markDirty();
                    return true;

                case 'enter':
                case 'Return':
                    this.mode = 'palette';
                    this.markDirty();
                    return true;

                case 'escape':
                    this.blur();
                    return true;
            }
        }

        return false;
    }

    private handleColorInput(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'enter':
                case 'Return':
                    this.selectedColor = this.parseColor(this.inputText);
                    this.updateInputText();
                    this.markDirty();
                    return true;

                case 'tab':
                    this.mode = 'palette';
                    this.markDirty();
                    return true;

                case 'escape':
                    this.blur();
                    return true;

                default:
                    if (input.key && input.key.length === 1) {
                        this.inputText += input.key;
                        this.markDirty();
                        return true;
                    } else if (input.key === 'backspace') {
                        this.inputText = this.inputText.slice(0, -1);
                        this.markDirty();
                        return true;
                    }
            }
        }

        return false;
    }

    private selectPresetColor(): void {
        if (this.selectedPresetIndex >= 0 && this.selectedPresetIndex < this.config.presetColors.length) {
            const color = this.config.presetColors[this.selectedPresetIndex];
            this.selectedColor = this.parseColor(color);
            this.updateInputText();
            this.markDirty();
        }
    }

    private adjustSlider(amount: number): void {
        switch (this.currentSlider) {
            case 0:
                this.selectedColor.r = Math.max(0, Math.min(255, this.selectedColor.r + amount));
                break;
            case 1:
                this.selectedColor.g = Math.max(0, Math.min(255, this.selectedColor.g + amount));
                break;
            case 2:
                this.selectedColor.b = Math.max(0, Math.min(255, this.selectedColor.b + amount));
                break;
            case 3:
                if (this.selectedColor.a !== undefined) {
                    this.selectedColor.a = Math.max(0, Math.min(1, this.selectedColor.a + (amount / 100)));
                }
                break;
        }
        this.updateInputText();
        this.markDirty();
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        if (this.config.showPreview) {
            lines.push(this.renderPreview());
        }

        switch (this.mode) {
            case 'palette':
                lines.push(...this.renderPalette());
                break;
            case 'sliders':
                lines.push(...this.renderSliders());
                break;
            case 'input':
                lines.push(this.renderInputField());
                break;
        }

        return lines.slice(0, this.size.height).join('\n');
    }

    private renderPreview(): string {
        const theme = this.theme.getCurrentTheme();
        const color = this.formatColor(this.selectedColor);
        const preview = '████████';
        const colorBlock = this.theme.applyColor(preview, 'textPrimary');

        return `${colorBlock} ${color}`;
    }

    private renderPalette(): string[] {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];
        const colorsPerRow = 8;

        for (let i = 0; i < this.config.presetColors.length; i += colorsPerRow) {
            let line = '';
            for (let j = 0; j < colorsPerRow && i + j < this.config.presetColors.length; j++) {
                const colorIndex = i + j;
                const color = this.config.presetColors[colorIndex];
                const isSelected = colorIndex === this.selectedPresetIndex;

                const block = isSelected ? '██▶' : '██ ';
                if (isSelected) {
                    line += this.theme.applyColor(block, 'primary');
                } else {
                    line += this.theme.applyColor(block, 'textPrimary');
                }
            }
            lines.push(line);
        }

        return lines;
    }

    private renderSliders(): string[] {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const sliders = [
            { label: 'Red', value: this.selectedColor.r, max: 255, color: 'error' },
            { label: 'Green', value: this.selectedColor.g, max: 255, color: 'success' },
            { label: 'Blue', value: this.selectedColor.b, max: 255, color: 'info' }
        ];

        if (this.config.showAlpha) {
            sliders.push({
                label: 'Alpha',
                value: Math.round((this.selectedColor.a ?? 1) * 100),
                max: 100,
                color: 'muted'
            });
        }

        for (let i = 0; i < sliders.length; i++) {
            const slider = sliders[i];
            const isActive = i === this.currentSlider;

            const barWidth = 30;
            const filledWidth = Math.round((slider.value / slider.max) * barWidth);
            const bar = '█'.repeat(filledWidth) + '░'.repeat(barWidth - filledWidth);

            let line = `${slider.label}: `;
            if (isActive) {
                line += this.theme.applyColor(bar, slider.color);
            } else {
                line += this.theme.applyColor(bar, 'textSecondary');
            }
            line += ` ${slider.value}`;

            lines.push(line);
        }

        return lines;
    }

    private renderInputField(): string {
        const theme = this.theme.getCurrentTheme();
        const label = 'Color: ';
        const input = this.inputText.padEnd(20, ' ');

        if (this.state.focused) {
            return label + this.theme.applyColor(input, 'primary');
        } else {
            return label + this.theme.applyColor(input, 'textSecondary');
        }
    }
}