import { BaseComponent } from './base-component';
import { type Size, type Position } from './types';

/**
 * Progress bar component options
 */
export interface ProgressOptions {
    title?: string;
    total?: number;
    value?: number;
    showPercentage?: boolean;
    showValue?: boolean;
    barChar?: string;
    emptyChar?: string;
    bracketChars?: [string, string];
    color?: number;
    height?: number;
}

/**
 * Progress bar component
 */
export class Progress extends BaseComponent {
    private options: Required<ProgressOptions>;
    private _value: number;
    private _total: number;

    constructor(id: string, options: ProgressOptions = {}) {
        super(id);

        this.options = {
            title: options.title || '',
            total: options.total || 100,
            value: options.value || 0,
            showPercentage: options.showPercentage !== false,
            showValue: options.showValue !== false,
            barChar: options.barChar || '█',
            emptyChar: options.emptyChar || '░',
            bracketChars: options.bracketChars || ['[', ']'],
            color: options.color || 36, // Cyan
            height: options.height || 1
        };

        this._value = this.options.value;
        this._total = this.options.total;
    }

    /**
     * Get current value
     */
    get value(): number {
        return this._value;
    }

    /**
     * Get total value
     */
    get total(): number {
        return this._total;
    }

    /**
     * Get percentage
     */
    get percentage(): number {
        return this._total > 0 ? (this._value / this._total) * 100 : 0;
    }

    /**
     * Set progress value
     */
    setValue(value: number): void {
        this._value = Math.max(0, Math.min(value, this._total));
        this.markDirty();
    }

    /**
     * Set total value
     */
    setTotal(total: number): void {
        this._total = Math.max(1, total);
        this._value = Math.min(this._value, this._total);
        this.markDirty();
    }

    /**
     * Increment progress
     */
    increment(amount: number = 1): void {
        this.setValue(this._value + amount);
    }

    /**
     * Decrement progress
     */
    decrement(amount: number = 1): void {
        this.setValue(this._value - amount);
    }

    /**
     * Set progress to complete
     */
    complete(): void {
        this.setValue(this._total);
    }

    /**
     * Reset progress
     */
    reset(): void {
        this.setValue(0);
    }

    /**
     * Check if progress is complete
     */
    isComplete(): boolean {
        return this._value >= this._total;
    }

    /**
     * Check if progress is started
     */
    isStarted(): boolean {
        return this._value > 0;
    }

    protected override onRender(): string {
        const { title, showPercentage, showValue, barChar, emptyChar, bracketChars, color } = this.options;
        const percentage = this.percentage;
        const filledLength = Math.round((percentage / 100) * this.width);

        // Build progress bar
        const filledBar = barChar.repeat(filledLength);
        const emptyBar = emptyChar.repeat(this.width - filledLength);
        const progressBar = `${bracketChars[0]}${filledBar}${emptyBar}${bracketChars[1]}`;

        // Apply color to progress bar
        const coloredBar = this.ansi.color(progressBar, color);

        let output = '';

        // Add title if provided
        if (title) {
            output += `${title}\n`;
        }

        // Add progress bar
        output += coloredBar;

        // Add additional info
        const info: string[] = [];

        if (showPercentage) {
            info.push(`${percentage.toFixed(1)}%`);
        }

        if (showValue) {
            info.push(`${this._value}/${this._total}`);
        }

        if (info.length > 0) {
            output += ` ${info.join(' ')}`;
        }

        // Add status
        if (this.isComplete()) {
            output += ' ✓';
        }

        return output;
    }

    protected override getDefaultSize(): Size {
        return {
            width: 40,
            height: this.options.height + (this.options.title ? 1 : 0)
        };
    }

    /**
     * Animate progress to a target value
     */
    async animateTo(targetValue: number, duration: number = 1000): Promise<void> {
        const startValue = this._value;
        const difference = targetValue - startValue;
        const steps = 30;
        const stepDuration = duration / steps;

        for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const easedProgress = this.easeInOutQuad(progress);
            const newValue = startValue + (difference * easedProgress);

            this.setValue(newValue);

            // Wait for next frame
            await new Promise(resolve => setTimeout(resolve, stepDuration));
        }

        this.setValue(targetValue);
    }

    /**
     * Easing function for smooth animation
     */
    private easeInOutQuad(t: number): number {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    /**
     * Create an indeterminate progress bar
     */
    static indeterminate(id: string, options: Omit<ProgressOptions, 'value'> = {}): Progress {
        const progress = new Progress(id, { ...options, value: 0 });

        let offset = 0;
        const animate = () => {
            if (!progress.isDestroyed) {
                // Simulate indeterminate animation
                const displayValue = ((offset + progress.width * 2) % (progress.width * 3)) / progress.width * progress.total;
                progress.setValue(displayValue);
                offset++;
                setTimeout(animate, 100);
            }
        };

        animate();

        return progress;
    }

    /**
     * Create a spinner progress bar
     */
    static spinner(id: string, options: Omit<ProgressOptions, 'barChar' | 'emptyChar'> = {}): Progress {
        const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let charIndex = 0;

        const progress = new Progress(id, {
            ...options,
            barChar: spinnerChars[0],
            value: 0
        });

        const interval = setInterval(() => {
            if (!progress.isDestroyed) {
                charIndex = (charIndex + 1) % spinnerChars.length;
                progress.options.barChar = spinnerChars[charIndex];
                progress.markDirty();
            } else {
                clearInterval(interval);
            }
        }, 100);

        // Store interval for cleanup
        (progress as any)._spinnerInterval = interval;

        return progress;
    }

    /**
     * Dispose of the progress bar
     */
    override dispose(): void {
        // Clear spinner interval if exists
        const interval = (this as any)._spinnerInterval;
        if (interval) {
            clearInterval(interval);
        }

        super.dispose();
    }
}