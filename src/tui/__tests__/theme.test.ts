import { 
    ThemeManager, 
    Theme,
    LIGHT_THEME, 
    DARK_THEME, 
    HIGH_CONTRAST_THEME,
    MINIMAL_THEME,
    BORDER_CHARS
} from '../theme';
import { AnsiUtils } from '../ansi-utils';

describe('Theme System', () => {
    let themeManager: ThemeManager;

    beforeEach(() => {
        // Get fresh instance by resetting singleton
        (ThemeManager as any).instance = undefined;
        themeManager = ThemeManager.getInstance();
    });

    describe('ThemeManager', () => {
        it('should be a singleton', () => {
            const instance1 = ThemeManager.getInstance();
            const instance2 = ThemeManager.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should initialize with dark theme as default', () => {
            const currentTheme = themeManager.getCurrentTheme();
            expect(currentTheme.name).toBe('Dark');
        });

        it('should register default themes', () => {
            const themes = themeManager.getAllThemes();
            const themeNames = themes.map(t => t.name);
            expect(themeNames).toContain('Light');
            expect(themeNames).toContain('Dark');
            expect(themeNames).toContain('High Contrast');
            expect(themeNames).toContain('Minimal');
        });

        it('should detect color capabilities', () => {
            const capabilities = themeManager.getColorCapabilities();
            expect(typeof capabilities).toBe('number');
            expect(capabilities).toBeGreaterThan(0);
        });
    });

    describe('Theme Registration', () => {
        it('should register a new theme', () => {
            const customTheme: Theme = {
                name: 'Custom',
                description: 'Custom test theme',
                colors: LIGHT_THEME.colors,
                borders: LIGHT_THEME.borders,
                spacing: LIGHT_THEME.spacing,
                typography: LIGHT_THEME.typography,
                shadows: false,
                animations: false
            };

            themeManager.registerTheme(customTheme);
            const retrieved = themeManager.getTheme('Custom');
            expect(retrieved).toEqual(customTheme);
        });

        it('should get theme by name', () => {
            const lightTheme = themeManager.getTheme('Light');
            expect(lightTheme).toBeDefined();
            expect(lightTheme?.name).toBe('Light');
        });

        it('should return undefined for non-existent theme', () => {
            const theme = themeManager.getTheme('NonExistent');
            expect(theme).toBeUndefined();
        });

        it('should get all registered themes', () => {
            const themes = themeManager.getAllThemes();
            expect(themes.length).toBeGreaterThanOrEqual(4);
            expect(themes.every(t => t.name && t.colors)).toBe(true);
        });
    });

    describe('Theme Switching', () => {
        it('should set theme by object', () => {
            themeManager.setTheme(LIGHT_THEME);
            const current = themeManager.getCurrentTheme();
            expect(current.name).toBe('Light');
        });

        it('should set theme by name', () => {
            themeManager.setTheme('High Contrast');
            const current = themeManager.getCurrentTheme();
            expect(current.name).toBe('High Contrast');
        });

        it('should throw error for invalid theme name', () => {
            expect(() => {
                themeManager.setTheme('InvalidTheme');
            }).toThrow("Theme 'InvalidTheme' not found");
        });

        it('should reset to default theme', () => {
            themeManager.setTheme('Light');
            themeManager.reset();
            const current = themeManager.getCurrentTheme();
            expect(current.name).toBe('Dark');
        });
    });

    describe('Color Application', () => {
        beforeEach(() => {
            themeManager.setTheme(DARK_THEME);
        });

        it('should apply color to text', () => {
            const colored = themeManager.applyColor('test', 'primary');
            expect(colored).toContain('test');
            expect(colored).toContain('\u001b['); // ANSI escape
        });

        it('should apply different colors for different keys', () => {
            const primary = themeManager.applyColor('text', 'primary');
            const error = themeManager.applyColor('text', 'error');
            expect(primary).not.toBe(error);
        });

        it('should use theme-specific colors', () => {
            themeManager.setTheme(LIGHT_THEME);
            const lightPrimary = themeManager.applyColor('text', 'primary');
            
            themeManager.setTheme(DARK_THEME);
            const darkPrimary = themeManager.applyColor('text', 'primary');
            
            // Light and dark themes have different primary colors
            expect(lightPrimary).not.toBe(darkPrimary);
        });
    });

    describe('Typography Application', () => {
        beforeEach(() => {
            themeManager.setTheme(DARK_THEME);
        });

        it('should apply bold style', () => {
            const styled = themeManager.applyTypography('text', 'heading');
            expect(styled).toContain(AnsiUtils.bold());
            expect(styled).toContain('text');
            expect(styled).toContain(AnsiUtils.reset());
        });

        it('should apply multiple styles', () => {
            themeManager.setTheme(HIGH_CONTRAST_THEME);
            const styled = themeManager.applyTypography('text', 'heading');
            expect(styled).toContain(AnsiUtils.bold());
            expect(styled).toContain(AnsiUtils.underline());
        });

        it('should apply text transform', () => {
            themeManager.setTheme(MINIMAL_THEME);
            const styled = themeManager.applyTypography('hello world', 'heading');
            expect(styled).toContain('HELLO WORLD');
        });

        it('should apply dim style', () => {
            const styled = themeManager.applyTypography('text', 'label');
            expect(styled).toContain(AnsiUtils.dim());
        });

        it('should handle capitalize transform', () => {
            const customTheme = themeManager.createCustomTheme(
                'TestCapitalize',
                'Dark',
                {
                    typography: {
                        default: {
                            bold: false,
                            italic: false,
                            underline: false,
                            strikethrough: false,
                            dim: false,
                            transform: 'capitalize'
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
                    }
                }
            );
            themeManager.setTheme(customTheme);
            const styled = themeManager.applyTypography('hello world test', 'default');
            expect(styled).toContain('Hello World Test');
        });
    });

    describe('Border Management', () => {
        it('should get border characters for single style', () => {
            themeManager.setTheme(LIGHT_THEME);
            const chars = themeManager.getBorderChars();
            expect(chars.topLeft).toBe('┌');
            expect(chars.horizontal).toBe('─');
            expect(chars.vertical).toBe('│');
        });

        it('should get border characters for double style', () => {
            themeManager.setTheme(HIGH_CONTRAST_THEME);
            const chars = themeManager.getBorderChars();
            expect(chars.topLeft).toBe('╔');
            expect(chars.horizontal).toBe('═');
            expect(chars.vertical).toBe('║');
        });

        it('should get border characters for none style', () => {
            themeManager.setTheme(MINIMAL_THEME);
            const chars = themeManager.getBorderChars();
            expect(chars.topLeft).toBe('');
            expect(chars.horizontal).toBe('');
            expect(chars.vertical).toBe('');
        });

        it('should apply border color', () => {
            themeManager.setTheme(DARK_THEME);
            const colored = themeManager.applyBorderColor('│');
            expect(colored).toContain('│');
            expect(colored).toContain('\u001b['); // ANSI escape
        });

        it('should not apply color if border color is undefined', () => {
            const customTheme: Theme = {
                name: 'NoBorderColor',
                description: 'Theme without border color',
                colors: DARK_THEME.colors,
                borders: { type: 'single' }, // No color property
                spacing: DARK_THEME.spacing,
                typography: DARK_THEME.typography,
                shadows: false,
                animations: false
            };
            themeManager.registerTheme(customTheme);
            themeManager.setTheme(customTheme);
            const char = '│';
            const result = themeManager.applyBorderColor(char);
            expect(result).toBe(char);
        });
    });

    describe('Spacing', () => {
        it('should get padding values', () => {
            themeManager.setTheme(LIGHT_THEME);
            const padding = themeManager.getPadding();
            expect(padding).toHaveProperty('top');
            expect(padding).toHaveProperty('right');
            expect(padding).toHaveProperty('bottom');
            expect(padding).toHaveProperty('left');
            expect(padding.top).toBe(1);
            expect(padding.right).toBe(2);
        });

        it('should get margin values', () => {
            themeManager.setTheme(HIGH_CONTRAST_THEME);
            const margin = themeManager.getMargin();
            expect(margin).toHaveProperty('top');
            expect(margin).toHaveProperty('right');
            expect(margin).toHaveProperty('bottom');
            expect(margin).toHaveProperty('left');
            expect(margin.top).toBe(1);
        });

        it('should return different spacing for different themes', () => {
            themeManager.setTheme(LIGHT_THEME);
            const lightPadding = themeManager.getPadding();
            
            themeManager.setTheme(HIGH_CONTRAST_THEME);
            const contrastPadding = themeManager.getPadding();
            
            expect(lightPadding.right).not.toBe(contrastPadding.right);
        });
    });

    describe('Theme Features', () => {
        it('should check if animations are enabled', () => {
            themeManager.setTheme(LIGHT_THEME);
            expect(themeManager.areAnimationsEnabled()).toBe(true);
            
            themeManager.setTheme(HIGH_CONTRAST_THEME);
            expect(themeManager.areAnimationsEnabled()).toBe(false);
        });

        it('should check if shadows are enabled', () => {
            themeManager.setTheme(DARK_THEME);
            expect(themeManager.areShadowsEnabled()).toBe(true);
            
            themeManager.setTheme(MINIMAL_THEME);
            expect(themeManager.areShadowsEnabled()).toBe(false);
        });
    });

    describe('Custom Theme Creation', () => {
        it('should create custom theme based on existing theme', () => {
            const custom = themeManager.createCustomTheme(
                'MyCustom',
                'Dark',
                {
                    description: 'My custom theme',
                    colors: { primary: 10 }
                }
            );

            expect(custom.name).toBe('MyCustom');
            expect(custom.description).toBe('My custom theme');
            expect(custom.colors.primary).toBe(10);
            expect(custom.colors.secondary).toBe(DARK_THEME.colors.secondary);
        });

        it('should throw error if base theme not found', () => {
            expect(() => {
                themeManager.createCustomTheme(
                    'Custom',
                    'NonExistent',
                    {}
                );
            }).toThrow("Base theme 'NonExistent' not found");
        });

        it('should register created custom theme', () => {
            const custom = themeManager.createCustomTheme(
                'AutoRegistered',
                'Light',
                { shadows: true }
            );

            const retrieved = themeManager.getTheme('AutoRegistered');
            expect(retrieved).toEqual(custom);
        });

        it('should merge nested properties correctly', () => {
            const custom = themeManager.createCustomTheme(
                'NestedMerge',
                'Dark',
                {
                    spacing: {
                        padding: { top: 5 },
                        gap: 10
                    },
                    typography: {
                        heading: { bold: false }
                    }
                }
            );

            expect(custom.spacing.padding.top).toBe(5);
            expect(custom.spacing.padding.right).toBe(DARK_THEME.spacing.padding.right);
            expect(custom.spacing.gap).toBe(10);
            expect(custom.typography.heading.bold).toBe(false);
            expect(custom.typography.heading.italic).toBe(DARK_THEME.typography.heading.italic);
        });
    });

    describe('Predefined Themes', () => {
        it('should have correct light theme configuration', () => {
            expect(LIGHT_THEME.name).toBe('Light');
            expect(LIGHT_THEME.colors.background).toBe(15); // White
            expect(LIGHT_THEME.colors.foreground).toBe(0); // Black
            expect(LIGHT_THEME.borders.type).toBe('single');
        });

        it('should have correct dark theme configuration', () => {
            expect(DARK_THEME.name).toBe('Dark');
            expect(DARK_THEME.colors.background).toBe(0); // Black
            expect(DARK_THEME.colors.foreground).toBe(15); // White
            expect(DARK_THEME.shadows).toBe(true);
        });

        it('should have correct high contrast theme configuration', () => {
            expect(HIGH_CONTRAST_THEME.name).toBe('High Contrast');
            expect(HIGH_CONTRAST_THEME.borders.type).toBe('double');
            expect(HIGH_CONTRAST_THEME.typography.default.bold).toBe(true);
            expect(HIGH_CONTRAST_THEME.animations).toBe(false);
        });

        it('should have correct minimal theme configuration', () => {
            expect(MINIMAL_THEME.name).toBe('Minimal');
            expect(MINIMAL_THEME.borders.type).toBe('none');
            expect(MINIMAL_THEME.spacing.padding.top).toBe(0);
            expect(MINIMAL_THEME.shadows).toBe(false);
        });
    });

    describe('Border Character Sets', () => {
        it('should have all required characters for single borders', () => {
            const single = BORDER_CHARS.single;
            expect(single.topLeft).toBe('┌');
            expect(single.topRight).toBe('┐');
            expect(single.bottomLeft).toBe('└');
            expect(single.bottomRight).toBe('┘');
            expect(single.horizontal).toBe('─');
            expect(single.vertical).toBe('│');
        });

        it('should have all required characters for double borders', () => {
            const double = BORDER_CHARS.double;
            expect(double.topLeft).toBe('╔');
            expect(double.topRight).toBe('╗');
            expect(double.bottomLeft).toBe('╚');
            expect(double.bottomRight).toBe('╝');
            expect(double.horizontal).toBe('═');
            expect(double.vertical).toBe('║');
        });

        it('should have all required characters for rounded borders', () => {
            const rounded = BORDER_CHARS.rounded;
            expect(rounded.topLeft).toBe('╭');
            expect(rounded.topRight).toBe('╮');
            expect(rounded.bottomLeft).toBe('╰');
            expect(rounded.bottomRight).toBe('╯');
        });

        it('should have empty strings for none borders', () => {
            const none = BORDER_CHARS.none;
            expect(none.topLeft).toBe('');
            expect(none.topRight).toBe('');
            expect(none.bottomLeft).toBe('');
            expect(none.bottomRight).toBe('');
            expect(none.horizontal).toBe('');
            expect(none.vertical).toBe('');
        });
    });
});
