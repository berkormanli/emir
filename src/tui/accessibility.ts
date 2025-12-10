import { EventEmitter } from 'events';
import { AnsiUtils } from './ansi-utils.js';
import type { TerminalSize } from './types.js';

/**
 * Focus outline styles
 */
export type FocusOutlineStyle = 'solid' | 'dashed' | 'double' | 'dotted' | 'bold';

/**
 * Hint bar position
 */
export type HintBarPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * Audio cue types
 */
export type AudioCueType = 'focus' | 'select' | 'error' | 'success' | 'warning' | 'navigation' | 'notification';

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
    // Focus management
    focusVisible: boolean;
    focusOutlineStyle: FocusOutlineStyle;
    focusOutlineColor: number;
    focusHighlightColor: number;

    // High contrast mode
    highContrast: boolean;
    highContrastColors: {
        background: number;
        foreground: number;
        focus: number;
        selection: number;
        border: number;
    };

    // Reduced motion
    reducedMotion: boolean;
    animationDuration: number; // ms

    // Screen reader support
    screenReader: boolean;
    screenReaderMode: 'basic' | 'enhanced' | 'full';

    // Visual indicators
    showHints: boolean;
    hintBarPosition: HintBarPosition;
    hintTimeout: number; // ms

    // Audio feedback
    audioEnabled: boolean;
    audioVolume: number; // 0-1
    audioCues: Map<AudioCueType, AudioCue>;

    // Color blindness accommodations
    colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
    colorBlindAdjustments: boolean;

    // Keyboard navigation
    keyboardNavigation: boolean;
    tabNavigation: boolean;
    arrowKeyNavigation: boolean;

    // Text accommodations
    increaseContrast: boolean;
    increaseFontSize: boolean;
    dyslexiaFont: boolean;
}

/**
 * Audio cue definition
 */
export interface AudioCue {
    frequency: number; // Hz
    duration: number; // ms
    volume: number; // 0-1
    waveType: 'sine' | 'square' | 'sawtooth' | 'triangle';
}

/**
 * Hint bar content
 */
export interface HintContent {
    title: string;
    description?: string;
    shortcuts: Array<{
        key: string;
        action: string;
    }>;
    progress?: {
        current: number;
        total: number;
        label?: string;
    };
    timeout?: number;
}

/**
 * Focus state
 */
export interface FocusState {
    x: number;
    y: number;
    width: number;
    height: number;
    component: string;
    id: string;
}

/**
 * Accessibility manager class
 */
export class AccessibilityManager extends EventEmitter {
    private config: AccessibilityConfig;
    private terminalSize: TerminalSize;
    private currentFocus: FocusState | null = null;
    private hintVisible: boolean = false;
    private hintContent: HintContent | null = null;
    private hintTimer: NodeJS.Timeout | null = null;
    private audioContext: any = null; // Web Audio API placeholder

    constructor(terminalSize: TerminalSize) {
        super();
        this.terminalSize = terminalSize;
        this.config = this.getDefaultConfig();
        this.initializeAudio();
    }

    /**
     * Get default accessibility configuration
     */
    private getDefaultConfig(): AccessibilityConfig {
        return {
            focusVisible: true,
            focusOutlineStyle: 'solid',
            focusOutlineColor: 11, // Yellow
            focusHighlightColor: 4, // Blue

            highContrast: false,
            highContrastColors: {
                background: 0,  // Black
                foreground: 15, // White
                focus: 11,      // Yellow
                selection: 4,   // Blue
                border: 15      // White
            },

            reducedMotion: false,
            animationDuration: 300,

            screenReader: false,
            screenReaderMode: 'basic',

            showHints: true,
            hintBarPosition: 'bottom',
            hintTimeout: 3000,

            audioEnabled: true,
            audioVolume: 0.5,
            audioCues: this.getDefaultAudioCues(),

            colorBlindMode: 'none',
            colorBlindAdjustments: true,

            keyboardNavigation: true,
            tabNavigation: true,
            arrowKeyNavigation: true,

            increaseContrast: false,
            increaseFontSize: false,
            dyslexiaFont: false
        };
    }

    /**
     * Get default audio cues
     */
    private getDefaultAudioCues(): Map<AudioCueType, AudioCue> {
        const cues = new Map();

        cues.set('focus', {
            frequency: 440,  // A4
            duration: 50,
            volume: 0.3,
            waveType: 'sine'
        });

        cues.set('select', {
            frequency: 523,  // C5
            duration: 100,
            volume: 0.4,
            waveType: 'sine'
        });

        cues.set('error', {
            frequency: 220,  // A3
            duration: 200,
            volume: 0.5,
            waveType: 'square'
        });

        cues.set('success', {
            frequency: 659,  // E5
            duration: 150,
            volume: 0.4,
            waveType: 'triangle'
        });

        cues.set('warning', {
            frequency: 330,  // E4
            duration: 150,
            volume: 0.4,
            waveType: 'sawtooth'
        });

        cues.set('navigation', {
            frequency: 392,  // G4
            duration: 50,
            volume: 0.2,
            waveType: 'sine'
        });

        cues.set('notification', {
            frequency: 880,  // A5
            duration: 200,
            volume: 0.3,
            waveType: 'sine'
        });

        return cues;
    }

    /**
     * Initialize audio context (placeholder)
     */
    private initializeAudio(): void {
        // In Node.js, would use node-speaker or similar
        // For now, we'll emit events that can be handled by the audio system
        this.audioContext = {
            enabled: this.config.audioEnabled,
            volume: this.config.audioVolume
        };
    }

    /**
     * Update configuration
     */
    updateConfig(updates: Partial<AccessibilityConfig>): void {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...updates };

        // Apply audio volume change
        if (this.audioContext && updates.audioVolume !== undefined) {
            this.audioContext.volume = this.config.audioVolume;
        }

        this.emit('configChanged', { oldConfig, newConfig: this.config });
    }

    /**
     * Get current configuration
     */
    getConfig(): AccessibilityConfig {
        return { ...this.config };
    }

    /**
     * Set focus on a component
     */
    setFocus(focus: FocusState): void {
        // Clear previous focus
        this.clearFocus();

        this.currentFocus = focus;

        // Play focus audio cue
        if (this.config.audioEnabled) {
            this.playAudioCue('focus');
        }

        // Announce to screen reader
        if (this.config.screenReader) {
            this.announceToScreenReader(`Focused on ${focus.component}`);
        }

        this.emit('focusChanged', focus);
    }

    /**
     * Clear current focus
     */
    clearFocus(): void {
        if (this.currentFocus) {
            this.currentFocus = null;
            this.emit('focusCleared');
        }
    }

    /**
     * Get current focus
     */
    getCurrentFocus(): FocusState | null {
        return this.currentFocus ? { ...this.currentFocus } : null;
    }

    /**
     * Render focus outline
     */
    renderFocusOutline(): string {
        if (!this.config.focusVisible || !this.currentFocus) {
            return '';
        }

        const { x, y, width, height } = this.currentFocus;
        let output = '';

        // Choose outline characters based on style
        const outlineChars = this.getOutlineCharacters();

        // Top border
        output += AnsiUtils.moveCursor(x, y);
        output += AnsiUtils.colorText(outlineChars.topLeft + outlineChars.horizontal.repeat(width - 2) + outlineChars.topRight, this.config.focusOutlineColor);
        output += '\n';

        // Middle
        for (let i = 1; i < height - 1; i++) {
            output += AnsiUtils.moveCursor(x, y + i);
            output += AnsiUtils.colorText(outlineChars.vertical, this.config.focusOutlineColor);
            output += AnsiUtils.moveCursor(x + width - 1, y + i);
            output += AnsiUtils.colorText(outlineChars.vertical, this.config.focusOutlineColor);
            output += '\n';
        }

        // Bottom border
        if (height > 1) {
            output += AnsiUtils.moveCursor(x, y + height - 1);
            output += AnsiUtils.colorText(outlineChars.bottomLeft + outlineChars.horizontal.repeat(width - 2) + outlineChars.bottomRight, this.config.focusOutlineColor);
        }

        return output;
    }

    /**
     * Get outline characters based on style
     */
    private getOutlineCharacters(): any {
        const chars = {
            solid: {
                topLeft: '┌',
                topRight: '┐',
                bottomLeft: '└',
                bottomRight: '┘',
                horizontal: '─',
                vertical: '│'
            },
            dashed: {
                topLeft: '┌',
                topRight: '┐',
                bottomLeft: '└',
                bottomRight: '┘',
                horizontal: '╌',
                vertical: '┊'
            },
            double: {
                topLeft: '╔',
                topRight: '╗',
                bottomLeft: '╚',
                bottomRight: '╝',
                horizontal: '═',
                vertical: '║'
            },
            dotted: {
                topLeft: '┌',
                topRight: '┐',
                bottomLeft: '└',
                bottomRight: '┘',
                horizontal: '┈',
                vertical: '┆'
            },
            bold: {
                topLeft: '┏',
                topRight: '┓',
                bottomLeft: '┗',
                bottomRight: '┛',
                horizontal: '━',
                vertical: '┃'
            }
        };

        return chars[this.config.focusOutlineStyle] || chars.solid;
    }

    /**
     * Show hint bar
     */
    showHint(content: HintContent): void {
        if (!this.config.showHints) {
            return;
        }

        this.hintContent = content;
        this.hintVisible = true;

        // Clear existing timer
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
        }

        // Set new timer
        const timeout = content.timeout || this.config.hintTimeout;
        if (timeout > 0) {
            this.hintTimer = setTimeout(() => {
                this.hideHint();
            }, timeout);
        }

        this.emit('hintShown', content);
    }

    /**
     * Hide hint bar
     */
    hideHint(): void {
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
            this.hintTimer = null;
        }

        this.hintVisible = false;
        this.hintContent = null;
        this.emit('hintHidden');
    }

    /**
     * Render hint bar
     */
    renderHintBar(): string {
        if (!this.hintVisible || !this.hintContent) {
            return '';
        }

        const { title, description, shortcuts, progress } = this.hintContent;
        const { width, height } = this.terminalSize;
        let output = '';
        let y = 0;

        // Calculate position
        switch (this.config.hintBarPosition) {
            case 'top':
                y = 1;
                break;
            case 'bottom':
                y = height - 3;
                break;
            case 'left':
                // Left hints would be vertical
                return this.renderVerticalHint();
            case 'right':
                // Right hints would be vertical
                return this.renderVerticalHint();
        }

        // Render hint box
        const boxWidth = Math.min(width - 4, 60);
        const boxHeight = 3;

        // Top border
        output += AnsiUtils.moveCursor(2, y);
        output += AnsiUtils.colorText('┌' + '─'.repeat(boxWidth - 2) + '┐', 8);

        // Title line
        let titleLine = ` ${title}`;
        if (description) {
            titleLine += ` - ${description}`;
        }
        titleLine = titleLine.substring(0, boxWidth - 4);
        titleLine = titleLine.padEnd(boxWidth - 4);

        output += AnsiUtils.moveCursor(2, y + 1);
        output += AnsiUtils.colorText('│', 8);
        output += AnsiUtils.bold() + titleLine + AnsiUtils.reset();
        output += AnsiUtils.colorText('│', 8);

        // Bottom border with shortcuts
        let shortcutText = '';
        if (shortcuts && shortcuts.length > 0) {
            shortcutText = ' ' + shortcuts.map(s => `${s.key}: ${s.action}`).join(' | ');
        }
        if (progress) {
            shortcutText += ` [${progress.current}/${progress.total}]`;
        }
        shortcutText = shortcutText.substring(0, boxWidth - 4).padEnd(boxWidth - 4);

        output += AnsiUtils.moveCursor(2, y + 2);
        output += AnsiUtils.colorText('│', 8);
        output += AnsiUtils.dim() + shortcutText + AnsiUtils.reset();
        output += AnsiUtils.colorText('│', 8);

        output += AnsiUtils.moveCursor(2, y + 3);
        output += AnsiUtils.colorText('└' + '─'.repeat(boxWidth - 2) + '┘', 8);

        return output;
    }

    /**
     * Render vertical hint bar (for left/right positions)
     */
    private renderVerticalHint(): string {
        if (!this.hintContent) {
            return '';
        }

        // Implementation for vertical hint bars
        // Would be positioned on the left or right side
        return '';
    }

    /**
     * Play audio cue
     */
    playAudioCue(type: AudioCueType): void {
        if (!this.config.audioEnabled) {
            return;
        }

        const cue = this.config.audioCues.get(type);
        if (!cue) {
            return;
        }

        // Emit audio event for the audio system to handle
        this.emit('audioCue', {
            type,
            frequency: cue.frequency,
            duration: cue.duration,
            volume: cue.volume * this.config.audioVolume,
            waveType: cue.waveType
        });

        // In a real implementation, would use Web Audio API or node-speaker
        // For now, we emit an event
    }

    /**
     * Announce content to screen reader
     */
    announceToScreenReader(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
        if (!this.config.screenReader) {
            return;
        }

        // Emit announcement event
        this.emit('screenReaderAnnouncement', {
            text,
            priority,
            mode: this.config.screenReaderMode
        });

        // In a real implementation, would use appropriate screen reader APIs
        // or provide output in a format screen readers can parse
    }

    /**
     * Adjust colors for color blindness
     */
    adjustColorsForColorBlindness(color: number): number {
        if (!this.config.colorBlindAdjustments || this.config.colorBlindMode === 'none') {
            return color;
        }

        // Simplified color adjustments
        // Real implementation would use proper color space transformations
        switch (this.config.colorBlindMode) {
            case 'protanopia': // Red-blind
                // Convert reds to yellows/browns
                if (color === 1 || color === 9) return 3; // Red to Yellow
                break;

            case 'deuteranopia': // Green-blind
                // Convert greens to yellows/blues
                if (color === 2 || color === 10) return 3; // Green to Yellow
                break;

            case 'tritanopia': // Blue-blind
                // Convert blues to cyans/greens
                if (color === 4 || color === 12) return 6; // Blue to Cyan
                break;

            case 'achromatopsia': // Complete color blindness
                // Convert to grayscale
                return this.getGrayscaleEquivalent(color);
        }

        return color;
    }

    /**
     * Get grayscale equivalent of a color
     */
    private getGrayscaleEquivalent(color: number): number {
        // Simple mapping to grayscale colors
        const grayscaleMap: Record<number, number> = {
            1: 8,   // Red -> Gray
            2: 7,   // Green -> Light Gray
            3: 7,   // Yellow -> Light Gray
            4: 8,   // Blue -> Gray
            5: 8,   // Magenta -> Gray
            6: 7,   // Cyan -> Light Gray
            9: 8,   // Light Red -> Gray
            10: 7,  // Light Green -> Light Gray
            11: 7,  // Light Yellow -> Light Gray
            12: 8,  // Light Blue -> Gray
            13: 8,  // Light Magenta -> Gray
            14: 7,  // Light Cyan -> Light Gray
        };

        return grayscaleMap[color] || 8;
    }

    /**
     * Get high contrast colors
     */
    getHighContrastColors() {
        return this.config.highContrast ? this.config.highContrastColors : null;
    }

    /**
     * Check if animations should be disabled
     */
    shouldDisableAnimations(): boolean {
        return this.config.reducedMotion || !this.config.animationDuration;
    }

    /**
     * Get animation duration
     */
    getAnimationDuration(): number {
        return this.shouldDisableAnimations() ? 0 : this.config.animationDuration;
    }

    /**
     * Update terminal size
     */
    updateTerminalSize(size: TerminalSize): void {
        this.terminalSize = size;
        this.emit('terminalSizeChanged', size);
    }

    /**
     * Enable/disable screen reader mode
     */
    setScreenReaderMode(enabled: boolean, mode?: 'basic' | 'enhanced' | 'full'): void {
        this.updateConfig({
            screenReader: enabled,
            ...(mode && { screenReaderMode: mode })
        });
    }

    /**
     * Enable/disable high contrast mode
     */
    setHighContrastMode(enabled: boolean): void {
        this.updateConfig({ highContrast: enabled });
    }

    /**
     * Enable/disable reduced motion
     */
    setReducedMotion(enabled: boolean): void {
        this.updateConfig({ reducedMotion: enabled });
    }

    /**
     * Set color blind mode
     */
    setColorBlindMode(mode: AccessibilityConfig['colorBlindMode']): void {
        this.updateConfig({ colorBlindMode: mode });
    }

    /**
     * Enable/disable audio cues
     */
    setAudioEnabled(enabled: boolean): void {
        this.updateConfig({ audioEnabled: enabled });
    }

    /**
     * Set audio volume
     */
    setAudioVolume(volume: number): void {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        this.updateConfig({ audioVolume: clampedVolume });
    }

    /**
     * Toggle visibility of hints
     */
    setHintsVisible(visible: boolean): void {
        this.updateConfig({ showHints: visible });
        if (!visible) {
            this.hideHint();
        }
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        if (this.hintTimer) {
            clearTimeout(this.hintTimer);
        }
        this.removeAllListeners();
    }
}