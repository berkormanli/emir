import { EventEmitter } from 'events';
import { AnsiUtils } from './ansi-utils.js';
import type { TerminalCapabilities } from './types.js';

/**
 * Enhanced color scheme with automatic palette support
 */
export interface ColorScheme {
    // Base colors
    primary: number;
    secondary: number;
    success: number;
    warning: number;
    error: number;
    info: number;

    // UI colors
    background: number;
    foreground: number;
    border: number;
    shadow: number;

    // Component colors
    textPrimary: number;
    textSecondary: number;
    textDisabled: number;
    selection: number;
    selectionText: number;
    focus: number;
    hover: number;
    active: number;

    // Semantic colors
    link: number;
    visited: number;
    highlight: number;
    muted: number;

    // Extended palette for accessibility
    accessibleFocus?: number;
    accessibleHover?: number;
    highContrast?: boolean;
}

/**
 * Component-specific theme tokens
 */
export interface ComponentTokens {
    // Button tokens
    button: {
        primary: {
            background: number;
            foreground: number;
            focus: number;
            hover: number;
            disabled: number;
        };
        secondary: {
            background: number;
            foreground: number;
            focus: number;
            hover: number;
            disabled: number;
        };
        danger: {
            background: number;
            foreground: number;
            focus: number;
            hover: number;
            disabled: number;
        };
        borderRadius: number;
        padding: { x: number; y: number };
    };

    // Input tokens
    input: {
        background: number;
        foreground: number;
        border: number;
        borderFocus: number;
        borderError: number;
        placeholder: number;
        selection: number;
        selectionText: number;
        borderRadius: number;
        padding: { x: number; y: number };
    };

    // Container tokens
    container: {
        background: number;
        foreground: number;
        border: number;
        headerBackground: number;
        headerForeground: number;
        shadow: boolean;
        padding: { x: number; y: number };
    };

    // Progress bar tokens
    progressBar: {
        background: number;
        fill: number;
        fillSuccess: number;
        fillWarning: number;
        fillError: number;
        borderRadius: number;
        height: number;
    };

    // List/table tokens
    list: {
        background: number;
        foreground: number;
        alternateBackground: number;
        selectedBackground: number;
        selectedForeground: number;
        borderColor: number;
        padding: { x: number; y: number };
    };

    // Accessibility tokens
    accessibility: {
        focusOutlineColor: number;
        focusOutlineStyle: 'solid' | 'dashed' | 'double';
        highContrastMode: boolean;
        reducedMotion: boolean;
        screenReaderOptimized: boolean;
    };
}

/**
 * Responsive typography configuration
 */
export interface ResponsiveTypography {
    // Text styles
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    dim: boolean;

    // Text transform
    transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';

    // Responsive sizing
    size?: {
        small: number;
        medium: number;
        large: number;
        xlarge: number;
    };

    // Responsive line height
    lineHeight?: {
        small: number;
        medium: number;
        large: number;
    };

    // Letter spacing for readability
    letterSpacing?: number;
}

/**
 * Responsive spacing configuration
 */
export interface ResponsiveSpacing {
    // Base spacing
    base: number;

    // Scale
    scale: number[]; // [xs, sm, md, lg, xl, xxl]

    // Responsive breakpoints
    breakpoints: {
        small: number;
        medium: number;
        large: number;
    };

    // Component-specific spacing
    component: {
        padding: { top: number; right: number; bottom: number; left: number };
        margin: { top: number; right: number; bottom: number; left: number };
        gap: number;
    };
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
    enabled: boolean;
    duration: {
        fast: number; // ms
        normal: number; // ms
        slow: number; // ms
    };
    easing: {
        ease: string;
        easeIn: string;
        easeOut: string;
        easeInOut: string;
    };
    reducedMotion: boolean;
}

/**
 * Border style configuration
 */
export interface BorderStyle {
    type: 'single' | 'double' | 'rounded' | 'thick' | 'dashed' | 'dotted' | 'none';
    color?: number;
    chars?: BorderChars;
    width?: number;
    radius?: number;
}

/**
 * Border characters for custom styles
 */
export interface BorderChars {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
    horizontal: string;
    vertical: string;
    cross?: string;
    leftT?: string;
    rightT?: string;
    topT?: string;
    bottomT?: string;
}

/**
 * Complete enhanced theme interface
 */
export interface EnhancedTheme {
    name: string;
    description?: string;
    colors: ColorScheme;
    componentTokens: ComponentTokens;
    typography: {
        default: ResponsiveTypography;
        heading: ResponsiveTypography;
        label: ResponsiveTypography;
        button: ResponsiveTypography;
        input: ResponsiveTypography;
        error: ResponsiveTypography;
        code: ResponsiveTypography;
    };
    spacing: ResponsiveSpacing;
    borders: BorderStyle;
    shadows: boolean;
    animations: AnimationConfig;

    // Internationalization support
    rtl: boolean;
    font: {
        family: string;
        fallback: string[];
        unicodeSupport: boolean;
    };

    // Accessibility features
    accessibility: {
        highContrast: boolean;
        reducedMotion: boolean;
        screenReader: boolean;
        focusVisible: boolean;
        colorBlind: {
            type: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
            adjustments: boolean;
        };
    };

    // Theme metadata
    metadata: {
        version: string;
        author?: string;
        license?: string;
        tags: string[];
        darkMode: boolean;
    };
}

/**
 * Theme change event
 */
export interface ThemeChangeEvent {
    oldTheme: EnhancedTheme;
    newTheme: EnhancedTheme;
    transition: boolean;
}

/**
 * Palette detection result
 */
export interface PaletteDetection {
    detected: boolean;
    colors: {
        background: string;
        foreground: string;
        cursor?: string;
    };
    isDark: boolean;
    contrast: number;
    confidence: number;
}

/**
 * Enhanced theme manager with runtime switching and auto-detection
 */
export class ThemeManagerV2 extends EventEmitter {
    private static instance: ThemeManagerV2;
    private currentTheme: EnhancedTheme;
    private themes: Map<string, EnhancedTheme>;
    private terminalCapabilities: TerminalCapabilities;
    private responsiveBreakpoints: { small: number; medium: number; large: number };
    private i18n: {
        locale: string;
        rtl: boolean;
        textDirection: 'ltr' | 'rtl';
    };
    private audioEnabled: boolean;

    private constructor() {
        super();
        this.themes = new Map();
        this.responsiveBreakpoints = { small: 40, medium: 80, large: 120 };
        this.i18n = { locale: 'en', rtl: false, textDirection: 'ltr' };
        this.audioEnabled = true;

        // Load default themes
        this.loadDefaultThemes();

        // Set initial theme
        this.currentTheme = this.themes.get('Default')!;

        // Setup window resize listener for responsive adjustments
        this.setupResponsiveListeners();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): ThemeManagerV2 {
        if (!ThemeManagerV2.instance) {
            ThemeManagerV2.instance = new ThemeManagerV2();
        }
        return ThemeManagerV2.instance;
    }

    /**
     * Set terminal capabilities for theme adaptation
     */
    setTerminalCapabilities(capabilities: TerminalCapabilities): void {
        this.terminalCapabilities = capabilities;
        this.adaptThemeToCapabilities();
    }

    /**
     * Adapt current theme based on terminal capabilities
     */
    private adaptThemeToCapabilities(): void {
        const adapted = { ...this.currentTheme };

        // Color degradation based on capabilities
        if (this.terminalCapabilities.colors < 256) {
            adapted.colors = this.degradeColors(this.currentTheme.colors, this.terminalCapabilities.colors);
        }

        // Disable animations for reduced motion
        if (this.accessibilitySettings.reducedMotion) {
            adapted.animations.enabled = false;
        }

        // Unicode fallback for unsupported terminals
        if (!this.terminalCapabilities.unicode) {
            adapted.borders = this.createASCIIBorders(adapted.borders);
        }

        this.currentTheme = adapted;
        this.emit('themeAdapted', this.currentTheme);
    }

    /**
     * Degrade colors for limited color palettes
     */
    private degradeColors(colors: ColorScheme, maxColors: number): ColorScheme {
        const degraded = { ...colors };

        if (maxColors <= 16) {
            // Map to 16-color palette
            const colorMap: Record<number, number> = {
                // Reds
                196: 1, 160: 1, 124: 1, 88: 1, 52: 1, 9: 1,
                // Greens
                46: 2, 40: 2, 34: 2, 28: 2, 22: 2, 10: 2,
                // Yellows
                226: 3, 190: 3, 154: 3, 118: 3, 82: 3, 11: 3,
                // Blues
                21: 4, 27: 4, 33: 4, 39: 4, 45: 4, 12: 4,
                // Magentas
                201: 5, 165: 5, 129: 5, 93: 5, 57: 5, 13: 5,
                // Cyans
                51: 6, 87: 6, 123: 6, 159: 6, 195: 6, 14: 6,
                // Grays
                255: 15, 254: 7, 253: 7, 252: 7, 251: 7, 250: 7, 8: 8,
                244: 8, 243: 8, 242: 8, 241: 8, 240: 8, 0: 0
            };

            Object.keys(degraded).forEach(key => {
                const color = degraded[key as keyof ColorScheme];
                if (typeof color === 'number' && colorMap[color] !== undefined) {
                    (degraded as any)[key] = colorMap[color];
                }
            });
        } else if (maxColors <= 8) {
            // Map to 8-color palette
            degraded.primary = 4;
            degraded.secondary = 5;
            degraded.success = 2;
            degraded.warning = 3;
            degraded.error = 1;
            degraded.info = 6;
            degraded.background = 0;
            degraded.foreground = 7;
            degraded.textPrimary = 7;
            degraded.textSecondary = 8;
            degraded.textDisabled = 8;
        }

        return degraded;
    }

    /**
     * Create ASCII-compatible border characters
     */
    private createASCIIBorders(original: BorderStyle): BorderStyle {
        const asciiChars: BorderChars = {
            topLeft: '+',
            topRight: '+',
            bottomLeft: '+',
            bottomRight: '+',
            horizontal: '-',
            vertical: '|',
            cross: '+',
            leftT: '+',
            rightT: '+',
            topT: '+',
            bottomT: '+'
        };

        return {
            ...original,
            chars: asciiChars
        };
    }

    /**
     * Auto-detect terminal palette
     */
    async detectTerminalPalette(): Promise<PaletteDetection> {
        return new Promise((resolve) => {
            const detection: PaletteDetection = {
                detected: false,
                colors: {
                    background: '#000000',
                    foreground: '#ffffff'
                },
                isDark: true,
                contrast: 21,
                confidence: 0.5
            };

            // Check environment variables
            const colorTerm = process.env.COLORTERM;
            const term = process.env.TERM || '';

            // Basic light/dark detection
            if (term.includes('light') || process.env.THEME?.includes('light')) {
                detection.isDark = false;
                detection.colors.background = '#ffffff';
                detection.colors.foreground = '#000000';
            } else if (term.includes('dark') || process.env.THEME?.includes('dark')) {
                detection.isDark = true;
                detection.colors.background = '#000000';
                detection.colors.foreground = '#ffffff';
            }

            // Check terminal-specific themes
            if (colorTerm === 'truecolor' || colorTerm === '24bit') {
                detection.detected = true;
                detection.confidence = 0.8;
            }

            resolve(detection);
        });
    }

    /**
     * Register a new theme
     */
    registerTheme(theme: EnhancedTheme): void {
        this.themes.set(theme.name, theme);
        this.emit('themeRegistered', theme);
    }

    /**
     * Set theme with optional transition
     */
    setTheme(themeName: string, transition: boolean = true): void {
        const newTheme = this.themes.get(themeName);
        if (!newTheme) {
            throw new Error(`Theme '${themeName}' not found`);
        }

        const oldTheme = this.currentTheme;

        if (transition && this.currentTheme.animations.enabled) {
            this.performThemeTransition(oldTheme, newTheme);
        } else {
            this.currentTheme = newTheme;
        }

        this.emit('themeChanged', { oldTheme, newTheme: this.currentTheme, transition });
    }

    /**
     * Perform smooth theme transition
     */
    private performThemeTransition(oldTheme: EnhancedTheme, newTheme: EnhancedTheme): void {
        const duration = this.currentTheme.animations.duration.normal;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            if (progress < 1) {
                // Continue animation
                setTimeout(animate, 16); // ~60fps
            } else {
                // Animation complete
                this.currentTheme = newTheme;
                this.emit('themeTransitionComplete', newTheme);
            }
        };

        animate();
    }

    /**
     * Get theme for specific component
     */
    getComponentTheme(component: keyof ComponentTokens): any {
        return this.currentTheme.componentTokens[component];
    }

    /**
     * Get responsive value based on terminal size
     */
    getResponsiveValue<T>(values: { small: T; medium: T; large: T }, terminalWidth?: number): T {
        const width = terminalWidth || process.stdout.columns || 80;

        if (width < this.responsiveBreakpoints.small) {
            return values.small;
        } else if (width < this.responsiveBreakpoints.medium) {
            return values.medium;
        } else {
            return values.large;
        }
    }

    /**
     * Set internationalization settings
     */
    setI18n(locale: string, rtl: boolean = false): void {
        this.i18n = {
            locale,
            rtl,
            textDirection: rtl ? 'rtl' : 'ltr'
        };

        // Update current theme
        this.currentTheme.rtl = rtl;
        this.emit('i18nChanged', this.i18n);
    }

    /**
     * Get current locale settings
     */
    getI18n() {
        return { ...this.i18n };
    }

    /**
     * Toggle audio cues
     */
    setAudioEnabled(enabled: boolean): void {
        this.audioEnabled = enabled;
        this.emit('audioToggled', enabled);
    }

    /**
     * Play audio cue (if supported)
     */
    playAudioCue(cue: 'focus' | 'select' | 'error' | 'success' | 'notification'): void {
        if (!this.audioEnabled) return;

        // Emit audio event for audio system to handle
        this.emit('audioCue', cue);
    }

    /**
     * Get theme by name
     */
    getTheme(name: string): EnhancedTheme | undefined {
        return this.themes.get(name);
    }

    /**
     * Get current theme
     */
    getCurrentTheme(): EnhancedTheme {
        return this.currentTheme;
    }

    /**
     * Get all registered themes
     */
    getAllThemes(): EnhancedTheme[] {
        return Array.from(this.themes.values());
    }

    /**
     * Get accessibility settings
     */
    get accessibilitySettings() {
        return this.currentTheme.accessibility;
    }

    /**
     * Setup responsive listeners
     */
    private setupResponsiveListeners(): void {
        if (process.stdout.isTTY) {
            process.stdout.on('resize', () => {
                this.emit('terminalResize', {
                    width: process.stdout.columns,
                    height: process.stdout.rows
                });
            });
        }
    }

    /**
     * Load default themes
     */
    private loadDefaultThemes(): void {
        // Create a basic default theme to ensure currentTheme is always initialized
        const defaultTheme: EnhancedTheme = {
            name: 'Default',
            description: 'Default theme',
            colors: {
                primary: 4,
                secondary: 5,
                success: 2,
                warning: 3,
                error: 1,
                info: 6,
                background: 0,
                foreground: 15,
                border: 8,
                shadow: 8,
                textPrimary: 15,
                textSecondary: 8,
                textDisabled: 7,
                selection: 4,
                selectionText: 15,
                focus: 4,
                hover: 12,
                active: 4,
                link: 4,
                visited: 5,
                highlight: 11,
                muted: 8,
                accessibleFocus: 11,
                accessibleHover: 11,
                highContrast: false
            },
            componentTokens: {
                button: {
                    primary: {
                        background: 4,
                        foreground: 15,
                        focus: 12,
                        hover: 12,
                        disabled: 8
                    },
                    secondary: {
                        background: 8,
                        foreground: 15,
                        focus: 12,
                        hover: 12,
                        disabled: 8
                    },
                    danger: {
                        background: 1,
                        foreground: 15,
                        focus: 12,
                        hover: 12,
                        disabled: 8
                    },
                    borderRadius: 3,
                    padding: { x: 2, y: 1 }
                },
                input: {
                    background: 0,
                    foreground: 15,
                    border: 8,
                    borderFocus: 12,
                    borderError: 1,
                    placeholder: 7,
                    selection: 4,
                    selectionText: 15,
                    borderRadius: 2,
                    padding: { x: 1, y: 1 }
                },
                container: {
                    background: 0,
                    foreground: 15,
                    border: 8,
                    headerBackground: 8,
                    headerForeground: 15,
                    shadow: true,
                    padding: { x: 2, y: 1 }
                },
                progressBar: {
                    background: 8,
                    fill: 4,
                    fillSuccess: 2,
                    fillWarning: 3,
                    fillError: 1,
                    borderRadius: 2,
                    height: 1
                },
                list: {
                    background: 0,
                    foreground: 15,
                    alternateBackground: 8,
                    selectedBackground: 4,
                    selectedForeground: 15,
                    borderColor: 8,
                    padding: { x: 1, y: 0 }
                },
                accessibility: {
                    focusOutlineColor: 12,
                    focusOutlineStyle: 'solid',
                    highContrastMode: false,
                    reducedMotion: false,
                    screenReaderOptimized: false
                }
            },
            typography: {
                default: {
                    bold: false,
                    italic: false,
                    underline: false,
                    strikethrough: false,
                    dim: false,
                    size: { small: 12, medium: 14, large: 16, xlarge: 18 },
                    lineHeight: { small: 1.2, medium: 1.4, large: 1.6 }
                },
                heading: {
                    bold: true,
                    italic: false,
                    underline: false,
                    strikethrough: false,
                    dim: false,
                    size: { small: 16, medium: 20, large: 24, xlarge: 28 },
                    lineHeight: { small: 1.2, medium: 1.3, large: 1.4 }
                },
                label: {
                    bold: false,
                    italic: false,
                    underline: false,
                    strikethrough: false,
                    dim: true,
                    size: { small: 11, medium: 13, large: 15, xlarge: 17 }
                },
                button: {
                    bold: true,
                    italic: false,
                    underline: false,
                    strikethrough: false,
                    dim: false,
                    size: { small: 11, medium: 13, large: 15, xlarge: 17 }
                },
                input: {
                    bold: false,
                    italic: false,
                    underline: false,
                    strikethrough: false,
                    dim: false,
                    size: { small: 11, medium: 13, large: 15, xlarge: 17 }
                },
                error: {
                    bold: true,
                    italic: false,
                    underline: true,
                    strikethrough: false,
                    dim: false,
                    size: { small: 11, medium: 13, large: 15, xlarge: 17 }
                },
                code: {
                    bold: false,
                    italic: false,
                    underline: false,
                    strikethrough: false,
                    dim: false,
                    size: { small: 10, medium: 12, large: 14, xlarge: 16 }
                }
            },
            spacing: {
                base: 1,
                scale: [0.5, 0.75, 1, 1.25, 1.5, 2],
                breakpoints: { small: 40, medium: 80, large: 120 },
                component: {
                    padding: { top: 1, right: 2, bottom: 1, left: 2 },
                    margin: { top: 0, right: 0, bottom: 0, left: 0 },
                    gap: 1
                }
            },
            borders: {
                type: 'single',
                color: 8
            },
            shadows: false,
            animations: {
                enabled: true,
                duration: { fast: 100, normal: 300, slow: 500 },
                easing: {
                    ease: 'easeInOut',
                    easeIn: 'easeIn',
                    easeOut: 'easeOut',
                    easeInOut: 'easeInOut'
                },
                reducedMotion: false
            },
            rtl: false,
            font: {
                family: 'monospace',
                fallback: ['consolas', 'monaco', 'courier'],
                unicodeSupport: true
            },
            accessibility: {
                highContrast: false,
                reducedMotion: false,
                screenReader: false,
                focusVisible: true,
                colorBlind: {
                    type: 'none',
                    adjustments: false
                }
            },
            metadata: {
                version: '1.0.0',
                author: 'TUI Framework',
                license: 'MIT',
                tags: ['default'],
                darkMode: false
            }
        };

        // Register default theme
        this.registerTheme(defaultTheme);
    }

    /**
     * Apply theme to text content
     */
    applyThemeToText(text: string, style: keyof EnhancedTheme['typography'], colorKey?: keyof ColorScheme): string {
        const typography = this.currentTheme.typography[style];
        let result = text;

        // Apply text transform
        if (typography.transform) {
            switch (typography.transform) {
                case 'uppercase':
                    result = result.toUpperCase();
                    break;
                case 'lowercase':
                    result = result.toLowerCase();
                    break;
                case 'capitalize':
                    result = result.replace(/\b\w/g, l => l.toUpperCase());
                    break;
            }
        }

        // Apply text styles
        if (typography.bold) result = AnsiUtils.bold() + result;
        if (typography.italic) result = AnsiUtils.italic() + result;
        if (typography.underline) result = AnsiUtils.underline() + result;
        if (typography.strikethrough) result = AnsiUtils.strikethrough() + result;
        if (typography.dim) result = AnsiUtils.dim() + result;

        // Apply color if specified
        if (colorKey) {
            const color = this.currentTheme.colors[colorKey];
            result = AnsiUtils.colorText(result, color);
        }

        // Reset at the end
        result += AnsiUtils.reset();

        return result;
    }

    /**
     * Create custom theme from base
     */
    createCustomTheme(name: string, baseTheme: string, overrides: Partial<EnhancedTheme>): EnhancedTheme {
        const base = this.themes.get(baseTheme);
        if (!base) {
            throw new Error(`Base theme '${baseTheme}' not found`);
        }

        // Deep merge overrides
        const customTheme: EnhancedTheme = {
            ...base,
            name,
            ...overrides,
            colors: { ...base.colors, ...(overrides.colors || {}) },
            componentTokens: this.deepMerge(base.componentTokens, overrides.componentTokens || {}),
            typography: {
                default: { ...base.typography.default, ...(overrides.typography?.default || {}) },
                heading: { ...base.typography.heading, ...(overrides.typography?.heading || {}) },
                label: { ...base.typography.label, ...(overrides.typography?.label || {}) },
                button: { ...base.typography.button, ...(overrides.typography?.button || {}) },
                input: { ...base.typography.input, ...(overrides.typography?.input || {}) },
                error: { ...base.typography.error, ...(overrides.typography?.error || {}) },
                code: { ...base.typography.code, ...(overrides.typography?.code || {}) }
            },
            spacing: { ...base.spacing, ...(overrides.spacing || {}) },
            borders: { ...base.borders, ...(overrides.borders || {}) },
            animations: { ...base.animations, ...(overrides.animations || {}) },
            accessibility: { ...base.accessibility, ...(overrides.accessibility || {}) },
            metadata: { ...base.metadata, ...(overrides.metadata || {}) }
        };

        this.registerTheme(customTheme);
        return customTheme;
    }

    /**
     * Deep merge utility
     */
    private deepMerge<T>(target: T, source: Partial<T>): T {
        const result = { ...target };

        for (const key in source) {
            const sourceValue = source[key];
            const targetValue = result[key];

            if (sourceValue && typeof sourceValue === 'object' && targetValue && typeof targetValue === 'object') {
                result[key] = this.deepMerge(targetValue, sourceValue);
            } else if (sourceValue !== undefined) {
                result[key] = sourceValue as T[Extract<keyof T, string>];
            }
        }

        return result;
    }
}

export { ThemeManagerV2 as ThemeManager };