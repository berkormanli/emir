import { AnsiUtils } from './ansi-utils';

/**
 * Color scheme for a theme
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
}

/**
 * Border style configuration
 */
export interface BorderStyle {
    type: 'single' | 'double' | 'rounded' | 'thick' | 'none';
    color?: number;
    chars?: BorderChars;
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
 * Spacing configuration
 */
export interface Spacing {
    padding: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    margin: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    gap: number;
}

/**
 * Typography configuration
 */
export interface Typography {
    // Text styles
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    dim: boolean;
    
    // Text transform
    transform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
}

/**
 * Theme interface
 */
export interface Theme {
    name: string;
    description?: string;
    colors: ColorScheme;
    borders: BorderStyle;
    spacing: Spacing;
    typography: {
        default: Typography;
        heading: Typography;
        label: Typography;
        button: Typography;
        input: Typography;
        error: Typography;
    };
    shadows: boolean;
    animations: boolean;
}

/**
 * Predefined border character sets
 */
export const BORDER_CHARS: Record<string, BorderChars> = {
    single: {
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        horizontal: '─',
        vertical: '│',
        cross: '┼',
        leftT: '├',
        rightT: '┤',
        topT: '┬',
        bottomT: '┴'
    },
    double: {
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        horizontal: '═',
        vertical: '║',
        cross: '╬',
        leftT: '╠',
        rightT: '╣',
        topT: '╦',
        bottomT: '╩'
    },
    rounded: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        horizontal: '─',
        vertical: '│',
        cross: '┼',
        leftT: '├',
        rightT: '┤',
        topT: '┬',
        bottomT: '┴'
    },
    thick: {
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        horizontal: '━',
        vertical: '┃',
        cross: '╋',
        leftT: '┣',
        rightT: '┫',
        topT: '┳',
        bottomT: '┻'
    },
    none: {
        topLeft: '',
        topRight: '',
        bottomLeft: '',
        bottomRight: '',
        horizontal: '',
        vertical: '',
        cross: '',
        leftT: '',
        rightT: '',
        topT: '',
        bottomT: ''
    }
};

/**
 * Default light theme
 */
export const LIGHT_THEME: Theme = {
    name: 'Light',
    description: 'Default light theme with bright colors',
    colors: {
        primary: 4,      // Blue
        secondary: 5,    // Magenta
        success: 2,      // Green
        warning: 3,      // Yellow
        error: 1,        // Red
        info: 6,         // Cyan
        background: 15,  // White
        foreground: 0,   // Black
        border: 8,       // Gray
        shadow: 8,       // Gray
        textPrimary: 0,  // Black
        textSecondary: 8, // Gray
        textDisabled: 7, // Light gray
        selection: 4,    // Blue
        selectionText: 15, // White
        focus: 4,        // Blue
        hover: 12,       // Light blue
        active: 4,       // Blue
        link: 4,         // Blue
        visited: 5,      // Magenta
        highlight: 11,   // Yellow
        muted: 8         // Gray
    },
    borders: {
        type: 'single',
        color: 8
    },
    spacing: {
        padding: { top: 1, right: 2, bottom: 1, left: 2 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        gap: 1
    },
    typography: {
        default: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        heading: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        label: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        button: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        input: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        error: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        }
    },
    shadows: false,
    animations: true
};

/**
 * Default dark theme
 */
export const DARK_THEME: Theme = {
    name: 'Dark',
    description: 'Default dark theme with muted colors',
    colors: {
        primary: 12,     // Light blue
        secondary: 13,   // Light magenta
        success: 10,     // Light green
        warning: 11,     // Light yellow
        error: 9,        // Light red
        info: 14,        // Light cyan
        background: 0,   // Black
        foreground: 15,  // White
        border: 8,       // Gray
        shadow: 0,       // Black
        textPrimary: 15, // White
        textSecondary: 7, // Light gray
        textDisabled: 8, // Gray
        selection: 4,    // Blue
        selectionText: 15, // White
        focus: 12,       // Light blue
        hover: 4,        // Blue
        active: 12,      // Light blue
        link: 14,        // Light cyan
        visited: 13,     // Light magenta
        highlight: 11,   // Light yellow
        muted: 8         // Gray
    },
    borders: {
        type: 'single',
        color: 8
    },
    spacing: {
        padding: { top: 1, right: 2, bottom: 1, left: 2 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        gap: 1
    },
    typography: {
        default: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        heading: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        label: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: true
        },
        button: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        input: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        error: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        }
    },
    shadows: true,
    animations: true
};

/**
 * High contrast theme
 */
export const HIGH_CONTRAST_THEME: Theme = {
    name: 'High Contrast',
    description: 'High contrast theme for better visibility',
    colors: {
        primary: 15,     // White
        secondary: 11,   // Yellow
        success: 10,     // Bright green
        warning: 11,     // Yellow
        error: 9,        // Bright red
        info: 14,        // Bright cyan
        background: 0,   // Black
        foreground: 15,  // White
        border: 15,      // White
        shadow: 8,       // Gray
        textPrimary: 15, // White
        textSecondary: 11, // Yellow
        textDisabled: 8, // Gray
        selection: 11,   // Yellow
        selectionText: 0, // Black
        focus: 15,       // White
        hover: 11,       // Yellow
        active: 15,      // White
        link: 14,        // Bright cyan
        visited: 13,     // Bright magenta
        highlight: 11,   // Yellow
        muted: 8         // Gray
    },
    borders: {
        type: 'double',
        color: 15
    },
    spacing: {
        padding: { top: 1, right: 3, bottom: 1, left: 3 },
        margin: { top: 1, right: 1, bottom: 1, left: 1 },
        gap: 2
    },
    typography: {
        default: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        heading: {
            bold: true,
            italic: false,
            underline: true,
            strikethrough: false,
            dim: false
        },
        label: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        button: {
            bold: true,
            italic: false,
            underline: true,
            strikethrough: false,
            dim: false
        },
        input: {
            bold: true,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        error: {
            bold: true,
            italic: false,
            underline: true,
            strikethrough: false,
            dim: false
        }
    },
    shadows: false,
    animations: false
};

/**
 * Minimal theme
 */
export const MINIMAL_THEME: Theme = {
    name: 'Minimal',
    description: 'Minimal theme with no borders',
    colors: {
        primary: 7,      // White
        secondary: 8,    // Gray
        success: 2,      // Green
        warning: 3,      // Yellow
        error: 1,        // Red
        info: 6,         // Cyan
        background: 0,   // Black
        foreground: 7,   // White
        border: 0,       // No border (black)
        shadow: 0,       // No shadow
        textPrimary: 7,  // White
        textSecondary: 8, // Gray
        textDisabled: 8, // Gray
        selection: 7,    // White
        selectionText: 0, // Black
        focus: 7,        // White
        hover: 8,        // Gray
        active: 7,       // White
        link: 6,         // Cyan
        visited: 5,      // Magenta
        highlight: 3,    // Yellow
        muted: 8         // Gray
    },
    borders: {
        type: 'none'
    },
    spacing: {
        padding: { top: 0, right: 1, bottom: 0, left: 1 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        gap: 0
    },
    typography: {
        default: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        heading: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false,
            transform: 'uppercase'
        },
        label: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: true
        },
        button: {
            bold: false,
            italic: false,
            underline: true,
            strikethrough: false,
            dim: false
        },
        input: {
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            dim: false
        },
        error: {
            bold: false,
            italic: true,
            underline: false,
            strikethrough: false,
            dim: false
        }
    },
    shadows: false,
    animations: false
};

/**
 * Theme manager for applying themes to components
 */
export class ThemeManager {
    private static instance: ThemeManager;
    private currentTheme: Theme;
    private themes: Map<string, Theme>;
    private colorCapabilities: number;

    private constructor() {
        this.currentTheme = DARK_THEME;
        this.themes = new Map();
        this.colorCapabilities = this.detectColorCapabilities();
        
        // Register default themes
        this.registerTheme(LIGHT_THEME);
        this.registerTheme(DARK_THEME);
        this.registerTheme(HIGH_CONTRAST_THEME);
        this.registerTheme(MINIMAL_THEME);
    }

    /**
     * Get ThemeManager singleton instance
     */
    static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    /**
     * Detect terminal color capabilities
     */
    private detectColorCapabilities(): number {
        // Check for color support environment variables
        const colorterm = process.env.COLORTERM;
        const term = process.env.TERM || '';
        
        if (colorterm === 'truecolor' || colorterm === '24bit') {
            return 16777216; // 24-bit color
        }
        
        if (term.includes('256color')) {
            return 256;
        }
        
        if (term.includes('color')) {
            return 16;
        }
        
        // Default to 16 colors
        return 16;
    }

    /**
     * Get color capabilities
     */
    getColorCapabilities(): number {
        return this.colorCapabilities;
    }

    /**
     * Register a new theme
     */
    registerTheme(theme: Theme): void {
        this.themes.set(theme.name, theme);
    }

    /**
     * Get registered theme by name
     */
    getTheme(name: string): Theme | undefined {
        return this.themes.get(name);
    }

    /**
     * Get all registered themes
     */
    getAllThemes(): Theme[] {
        return Array.from(this.themes.values());
    }

    /**
     * Set current theme
     */
    setTheme(theme: Theme | string): void {
        if (typeof theme === 'string') {
            const foundTheme = this.themes.get(theme);
            if (foundTheme) {
                this.currentTheme = foundTheme;
            } else {
                throw new Error(`Theme '${theme}' not found`);
            }
        } else {
            this.currentTheme = theme;
        }
    }

    /**
     * Get current theme
     */
    getCurrentTheme(): Theme {
        return this.currentTheme;
    }

    /**
     * Apply color to text based on theme
     */
    applyColor(text: string, colorKey: keyof ColorScheme): string {
        const color = this.currentTheme.colors[colorKey];
        return AnsiUtils.colorText(text, color);
    }

    /**
     * Apply typography styles to text
     */
    applyTypography(text: string, style: keyof Theme['typography']): string {
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
        
        // Reset at the end
        result += AnsiUtils.reset();
        
        return result;
    }

    /**
     * Get border characters for current theme
     */
    getBorderChars(): BorderChars {
        const borderStyle = this.currentTheme.borders;
        if (borderStyle.chars) {
            return borderStyle.chars;
        }
        return BORDER_CHARS[borderStyle.type] || BORDER_CHARS.single;
    }

    /**
     * Apply border color
     */
    applyBorderColor(char: string): string {
        const color = this.currentTheme.borders.color;
        if (color !== undefined) {
            return AnsiUtils.colorText(char, color);
        }
        return char;
    }

    /**
     * Get padding values
     */
    getPadding(): { top: number; right: number; bottom: number; left: number } {
        return { ...this.currentTheme.spacing.padding };
    }

    /**
     * Get margin values
     */
    getMargin(): { top: number; right: number; bottom: number; left: number } {
        return { ...this.currentTheme.spacing.margin };
    }

    /**
     * Check if animations are enabled
     */
    areAnimationsEnabled(): boolean {
        return this.currentTheme.animations;
    }

    /**
     * Check if shadows are enabled
     */
    areShadowsEnabled(): boolean {
        return this.currentTheme.shadows;
    }

    /**
     * Create a custom theme based on an existing one
     */
    createCustomTheme(name: string, baseTheme: string, overrides: Partial<Theme>): Theme {
        const base = this.themes.get(baseTheme);
        if (!base) {
            throw new Error(`Base theme '${baseTheme}' not found`);
        }
        
        const customTheme: Theme = {
            ...base,
            name,
            ...overrides,
            colors: { ...base.colors, ...(overrides.colors || {}) },
            borders: { ...base.borders, ...(overrides.borders || {}) },
            spacing: {
                padding: { ...base.spacing.padding, ...(overrides.spacing?.padding || {}) },
                margin: { ...base.spacing.margin, ...(overrides.spacing?.margin || {}) },
                gap: overrides.spacing?.gap ?? base.spacing.gap
            },
            typography: {
                default: { ...base.typography.default, ...(overrides.typography?.default || {}) },
                heading: { ...base.typography.heading, ...(overrides.typography?.heading || {}) },
                label: { ...base.typography.label, ...(overrides.typography?.label || {}) },
                button: { ...base.typography.button, ...(overrides.typography?.button || {}) },
                input: { ...base.typography.input, ...(overrides.typography?.input || {}) },
                error: { ...base.typography.error, ...(overrides.typography?.error || {}) }
            }
        };
        
        this.registerTheme(customTheme);
        return customTheme;
    }

    /**
     * Reset to default theme
     */
    reset(): void {
        this.currentTheme = DARK_THEME;
    }
}
