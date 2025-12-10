import { BaseComponent } from './base-component';
import { Position, Size } from './types';
import { AnsiUtils } from './ansi-utils';

/**
 * Progress bar display styles
 */
export type ProgressBarStyle = 'bar' | 'blocks' | 'line' | 'dots' | 'spinner';

/**
 * Progress bar configuration options
 */
export interface ProgressBarOptions {
    label?: string;
    showPercentage?: boolean;
    showValue?: boolean;
    style?: ProgressBarStyle;
    indeterminate?: boolean;
    total?: number;
    fillChar?: string;
    emptyChar?: string;
    barStart?: string;
    barEnd?: string;
    width?: number;
    color?: number;
    backgroundColor?: number;
    animationSpeed?: number; // ms between animation frames
}

/**
 * Characters for different progress bar styles
 */
const PROGRESS_CHARS = {
    bar: {
        fill: '█',
        empty: '░',
        start: '[',
        end: ']'
    },
    blocks: {
        fill: '■',
        empty: '□',
        start: '',
        end: ''
    },
    line: {
        fill: '━',
        empty: '─',
        start: '┣',
        end: '┫'
    },
    dots: {
        fill: '●',
        empty: '○',
        start: '',
        end: ''
    }
};

/**
 * Spinner animation frames
 */
const SPINNER_FRAMES = {
    default: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    dots: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
    line: ['|', '/', '-', '\\'],
    circle: ['◐', '◓', '◑', '◒'],
    arc: ['◜', '◠', '◝', '◞', '◡', '◟'],
    box: ['▖', '▘', '▝', '▗'],
    bounce: ['⠁', '⠂', '⠄', '⡀', '⢀', '⠠', '⠐', '⠈']
};

/**
 * Interactive progress bar component
 */
export class ProgressBar extends BaseComponent {
    private progress: number;
    private total: number;
    private options: ProgressBarOptions;
    private animationFrame: number;
    private lastUpdateTime: number;
    private animationTimer?: NodeJS.Timeout;
    private spinnerType: keyof typeof SPINNER_FRAMES;

    constructor(
        id: string,
        options: ProgressBarOptions = {},
        position?: Position,
        size?: Size
    ) {
        const defaultSize = size || { 
            width: options.width || 40, 
            height: options.label ? 2 : 1 
        };
        super(id, position, defaultSize);
        
        this.progress = 0;
        this.total = options.total || 100;
        this.options = {
            showPercentage: true,
            showValue: false,
            style: 'bar',
            indeterminate: false,
            fillChar: undefined,
            emptyChar: undefined,
            barStart: undefined,
            barEnd: undefined,
            width: 40,
            color: 2, // Green
            backgroundColor: 8, // Gray
            animationSpeed: 100,
            ...options
        };
        
        this.animationFrame = 0;
        this.lastUpdateTime = Date.now();
        this.spinnerType = 'default';
        
        // Start animation if indeterminate
        if (this.options.indeterminate) {
            this.startAnimation();
        }
    }

    /**
     * Set progress value (0 to total)
     */
    setProgress(value: number): void {
        if (this.options.indeterminate) {
            return; // Ignore in indeterminate mode
        }
        
        this.progress = Math.max(0, Math.min(value, this.total));
        this.markDirty();
    }

    /**
     * Get current progress value
     */
    getProgress(): number {
        return this.progress;
    }

    /**
     * Get progress percentage (0-100)
     */
    getPercentage(): number {
        if (this.total === 0) return 0;
        return Math.round((this.progress / this.total) * 100);
    }

    /**
     * Increment progress by a value
     */
    increment(value: number = 1): void {
        this.setProgress(this.progress + value);
    }

    /**
     * Decrement progress by a value
     */
    decrement(value: number = 1): void {
        this.setProgress(this.progress - value);
    }

    /**
     * Reset progress to 0
     */
    reset(): void {
        this.progress = 0;
        this.animationFrame = 0;
        this.markDirty();
    }

    /**
     * Complete the progress (set to total)
     */
    complete(): void {
        this.setProgress(this.total);
    }

    /**
     * Set whether the progress bar is indeterminate
     */
    setIndeterminate(indeterminate: boolean): void {
        if (this.options.indeterminate === indeterminate) {
            return;
        }
        
        this.options.indeterminate = indeterminate;
        
        if (indeterminate) {
            this.startAnimation();
        } else {
            this.stopAnimation();
        }
        
        this.markDirty();
    }

    /**
     * Set the label
     */
    setLabel(label: string): void {
        this.options.label = label;
        this.size.height = label ? 2 : 1;
        this.markDirty();
    }

    /**
     * Set the total value
     */
    setTotal(total: number): void {
        this.total = Math.max(1, total);
        this.progress = Math.min(this.progress, this.total);
        this.markDirty();
    }

    /**
     * Set the progress bar style
     */
    setStyle(style: ProgressBarStyle): void {
        this.options.style = style;
        this.markDirty();
    }

    /**
     * Set spinner type for indeterminate mode
     */
    setSpinnerType(type: keyof typeof SPINNER_FRAMES): void {
        this.spinnerType = type;
        this.markDirty();
    }

    /**
     * Start animation for indeterminate mode
     */
    private startAnimation(): void {
        if (this.animationTimer) {
            return;
        }
        
        this.animationTimer = setInterval(() => {
            this.animationFrame++;
            this.markDirty();
            
            // Trigger re-render
            if (this.state.dirty) {
                // The parent component should handle re-rendering
                this.lastUpdateTime = Date.now();
            }
        }, this.options.animationSpeed);
    }

    /**
     * Stop animation
     */
    private stopAnimation(): void {
        if (this.animationTimer) {
            clearInterval(this.animationTimer);
            this.animationTimer = undefined;
        }
    }

    /**
     * Render the progress bar
     */
    render(): string {
        const lines: string[] = [];
        
        // Render label if present
        if (this.options.label) {
            lines.push(AnsiUtils.colorText(this.options.label, 7));
        }
        
        // Render progress bar
        if (this.options.indeterminate) {
            lines.push(this.renderIndeterminate());
        } else {
            lines.push(this.renderDeterminate());
        }
        
        // Mark as clean
        this.markClean();
        
        return lines.join('\n');
    }

    /**
     * Render determinate progress bar
     */
    private renderDeterminate(): string {
        const percentage = this.getPercentage();
        const barWidth = this.size.width;
        
        // Calculate space for percentage/value display
        let suffixText = '';
        if (this.options.showPercentage) {
            suffixText = ` ${percentage}%`;
        } else if (this.options.showValue) {
            suffixText = ` ${this.progress}/${this.total}`;
        }
        
        // Adjust bar width for suffix
        const availableWidth = barWidth - suffixText.length - 2; // -2 for start/end chars
        
        if (this.options.style === 'spinner') {
            // In determinate mode with spinner style, show spinner + percentage
            const frames = SPINNER_FRAMES[this.spinnerType];
            const frame = frames[this.animationFrame % frames.length];
            return `${frame} ${suffixText.trim()}`;
        }
        
        // Get characters for the selected style
        const chars = PROGRESS_CHARS[this.options.style as keyof typeof PROGRESS_CHARS] || PROGRESS_CHARS.bar;
        const fillChar = this.options.fillChar || chars.fill;
        const emptyChar = this.options.emptyChar || chars.empty;
        const startChar = this.options.barStart || chars.start;
        const endChar = this.options.barEnd || chars.end;
        
        // Calculate filled width
        const filledWidth = Math.max(0, Math.round((this.progress / this.total) * availableWidth));
        const emptyWidth = Math.max(0, availableWidth - filledWidth);
        
        // Build progress bar
        let bar = startChar;
        
        // Add filled portion
        if (filledWidth > 0) {
            const filledPortion = fillChar.repeat(filledWidth);
            bar += this.options.color !== undefined ? 
                AnsiUtils.colorText(filledPortion, this.options.color) : 
                filledPortion;
        }
        
        // Add empty portion
        if (emptyWidth > 0) {
            const emptyPortion = emptyChar.repeat(emptyWidth);
            bar += this.options.backgroundColor !== undefined ? 
                AnsiUtils.colorText(emptyPortion, this.options.backgroundColor) : 
                emptyPortion;
        }
        
        bar += endChar;
        bar += suffixText;
        
        return bar;
    }

    /**
     * Render indeterminate progress bar
     */
    private renderIndeterminate(): string {
        const barWidth = this.size.width;
        
        if (this.options.style === 'spinner') {
            // Show animated spinner
            const frames = SPINNER_FRAMES[this.spinnerType];
            const frame = frames[this.animationFrame % frames.length];
            const label = this.options.label || 'Loading';
            return `${frame} ${label}`;
        }
        
        // Animated progress bar
        const chars = PROGRESS_CHARS[this.options.style as keyof typeof PROGRESS_CHARS] || PROGRESS_CHARS.bar;
        const fillChar = this.options.fillChar || chars.fill;
        const emptyChar = this.options.emptyChar || chars.empty;
        const startChar = this.options.barStart || chars.start;
        const endChar = this.options.barEnd || chars.end;
        
        const availableWidth = barWidth - 2; // -2 for start/end chars
        const indicatorWidth = Math.max(3, Math.floor(availableWidth / 4));
        
        // Calculate position of the indicator
        const totalPositions = availableWidth - indicatorWidth;
        const currentPosition = this.animationFrame % (totalPositions * 2);
        const position = currentPosition < totalPositions ? 
            currentPosition : 
            totalPositions * 2 - currentPosition;
        
        // Build progress bar
        let bar = startChar;
        
        for (let i = 0; i < availableWidth; i++) {
            if (i >= position && i < position + indicatorWidth) {
                const char = this.options.color !== undefined ? 
                    AnsiUtils.colorText(fillChar, this.options.color) : 
                    fillChar;
                bar += char;
            } else {
                const char = this.options.backgroundColor !== undefined ? 
                    AnsiUtils.colorText(emptyChar, this.options.backgroundColor) : 
                    emptyChar;
                bar += char;
            }
        }
        
        bar += endChar;
        
        return bar;
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        this.stopAnimation();
        super.destroy();
    }

    /**
     * Check if animation should update
     */
    shouldAnimate(): boolean {
        if (!this.options.indeterminate) {
            return false;
        }
        
        const now = Date.now();
        const elapsed = now - this.lastUpdateTime;
        return elapsed >= this.options.animationSpeed!;
    }

    /**
     * Update animation frame
     */
    updateAnimation(): void {
        if (this.shouldAnimate()) {
            this.animationFrame++;
            this.lastUpdateTime = Date.now();
            this.markDirty();
        }
    }
}
