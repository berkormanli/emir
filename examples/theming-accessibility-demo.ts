/**
 * Comprehensive Theming, Accessibility & UX Demo
 *
 * This demo showcases the enhanced theming system, accessibility features,
 * and internationalization capabilities of the TUI framework.
 */

import {
  ThemeManagerV2,
  EnhancedTheme
} from '../src/tui/theme-v2.js';
import {
  AccessibilityManager
} from '../src/tui/accessibility.js';
import {
  AudioSystem
} from '../src/tui/audio-system.js';
import {
  AnimationSystem
} from '../src/tui/animation-system.js';
import {
  TextUtils
} from '../src/tui/text-utils.js';
import {
  I18nSystem,
  Locale
} from '../src/tui/i18n.js';
import {
  TerminalController
} from '../src/tui/terminal-controller.js';
import { AnsiUtils } from '../src/tui/ansi-utils.js';

/**
 * Demo application class
 */
class ThemedTUIDemo {
  private themeManager: ThemeManagerV2;
  private accessibilityManager: AccessibilityManager;
  private audioSystem: AudioSystem;
  private animationSystem: AnimationSystem;
  private i18nSystem: I18nSystem;
  private terminalController: TerminalController;
  private demoState: {
    currentTheme: number;
    currentLocale: number;
    currentFont: number;
    currentAnimation: number;
  };

  constructor() {
    // Initialize all systems
    this.themeManager = ThemeManagerV2.getInstance();
    this.terminalController = new TerminalController();
    this.accessibilityManager = new AccessibilityManager(this.terminalController.getTerminalSize());
    this.audioSystem = new AudioSystem();
    this.animationSystem = new AnimationSystem();
    this.i18nSystem = new I18nSystem();

    // Load demo themes
    this.loadDemoThemes();

    // Initialize state
    this.demoState = {
      currentTheme: 0,
      currentLocale: 0,
      currentFont: 0,
      currentAnimation: 0
    };

    // Setup terminal
    this.terminalController.enableRawMode();
    this.terminalController.enterAlternateScreen();
    this.terminalController.clearScreen();

    // Bind event handlers
    this.bindEventHandlers();
  }

  /**
   * Load demo themes
   */
  private loadDemoThemes(): void {
    // Modern Dark Theme
    const modernDark: EnhancedTheme = {
      name: 'Modern Dark',
      description: 'Modern dark theme with vibrant colors',
      colors: {
        primary: 39,       // Bright blue
        secondary: 201,    // Pink
        success: 46,      // Green
        warning: 226,     // Yellow
        error: 196,       // Red
        info: 87,         // Cyan
        background: 235,   // Dark gray
        foreground: 254,  // Light gray
        border: 59,       // Blue-gray
        shadow: 235,
        textPrimary: 254,
        textSecondary: 242,
        textDisabled: 238,
        selection: 39,
        selectionText: 235,
        focus: 87,
        hover: 68,
        active: 39,
        link: 39,
        visited: 201,
        highlight: 226,
        muted: 238,
        accessibleFocus: 226,
        accessibleHover: 226,
        highContrast: false
      },
      componentTokens: {
        button: {
          primary: {
            background: 39,
            foreground: 235,
            focus: 87,
            hover: 68,
            disabled: 238
          },
          secondary: {
            background: 238,
            foreground: 254,
            focus: 68,
            hover: 59,
            disabled: 235
          },
          danger: {
            background: 196,
            foreground: 235,
            focus: 226,
            hover: 202,
            disabled: 235
          },
          borderRadius: 3,
          padding: { x: 2, y: 1 }
        },
        input: {
          background: 235,
          foreground: 254,
          border: 59,
          borderFocus: 87,
          borderError: 196,
          placeholder: 238,
          selection: 39,
          selectionText: 235,
          borderRadius: 2,
          padding: { x: 1, y: 1 }
        },
        container: {
          background: 235,
          foreground: 254,
          border: 59,
          headerBackground: 59,
          headerForeground: 235,
          shadow: true,
          padding: { x: 2, y: 1 }
        },
        progressBar: {
          background: 238,
          fill: 39,
          fillSuccess: 46,
          fillWarning: 226,
          fillError: 196,
          borderRadius: 2,
          height: 1
        },
        list: {
          background: 235,
          foreground: 254,
          alternateBackground: 238,
          selectedBackground: 39,
          selectedForeground: 235,
          borderColor: 59,
          padding: { x: 1, y: 0 }
        },
        accessibility: {
          focusOutlineColor: 226,
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
        type: 'rounded',
        color: 59,
        width: 1,
        radius: 3
      },
      shadows: true,
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
        version: '2.0.0',
        author: 'TUI Framework',
        license: 'MIT',
        tags: ['modern', 'dark', 'vibrant'],
        darkMode: true
      }
    };

    // Cyberpunk Theme
    const cyberpunk: EnhancedTheme = {
      name: 'Cyberpunk',
      description: 'Neon-themed cyberpunk aesthetic',
      colors: {
        primary: 201,    // Pink
        secondary: 86,   // Cyan
        success: 46,     // Green
        warning: 226,    // Yellow
        error: 196,      // Red
        info: 51,        // Bright cyan
        background: 17,   // Dark blue
        foreground: 219, // Light cyan
        border: 86,      // Cyan
        shadow: 17,
        textPrimary: 219,
        textSecondary: 203,
        textDisabled: 235,
        selection: 201,
        selectionText: 17,
        focus: 86,
        hover: 203,
        active: 219,
        link: 86,
        visited: 201,
        highlight: 226,
        muted: 235,
        accessibleFocus: 226,
        accessibleHover: 226,
        highContrast: false
      },
      componentTokens: {
        button: {
          primary: {
            background: 201,
            foreground: 17,
            focus: 226,
            hover: 203,
            disabled: 235
          },
          secondary: {
            background: 86,
            foreground: 17,
            focus: 226,
            hover: 203,
            disabled: 235
          },
          danger: {
            background: 196,
            foreground: 17,
            focus: 51,
            hover: 202,
            disabled: 235
          },
          borderRadius: 3,
          padding: { x: 2, y: 1 }
        },
        input: {
          background: 17,
          foreground: 219,
          border: 86,
          borderFocus: 201,
          borderError: 196,
          placeholder: 235,
          selection: 201,
          selectionText: 17,
          borderRadius: 2,
          padding: { x: 1, y: 1 }
        },
        container: {
          background: 17,
          foreground: 219,
          border: 86,
          headerBackground: 86,
          headerForeground: 17,
          shadow: true,
          padding: { x: 2, y: 1 }
        },
        progressBar: {
          background: 235,
          fill: 201,
          fillSuccess: 46,
          fillWarning: 226,
          fillError: 196,
          borderRadius: 2,
          height: 1
        },
        list: {
          background: 17,
          foreground: 219,
          alternateBackground: 235,
          selectedBackground: 201,
          selectedForeground: 17,
          borderColor: 86,
          padding: { x: 1, y: 0 }
        },
        accessibility: {
          focusOutlineColor: 226,
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
        type: 'rounded',
        color: 86,
        width: 1,
        radius: 3
      },
      shadows: true,
      animations: {
        enabled: true,
        duration: { fast: 150, normal: 300, slow: 600 },
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
        version: '2.0.0',
        author: 'TUI Framework',
        license: 'MIT',
        tags: ['cyberpunk', 'neon', 'futuristic'],
        darkMode: true
      }
    };

    // Register themes
    this.themeManager.registerTheme(modernDark);
    this.themeManager.registerTheme(cyberpunk);
  }

  /**
   * Bind event handlers
   */
  private bindEventHandlers(): void {
    // Keyboard events
    process.stdin.on('data', (data) => {
      const key = data.toString().trim();
      this.handleKeyPress(key);
    });

    // Resize events
    process.stdout.on('resize', () => {
      const size = this.terminalController.getTerminalSize();
      this.accessibilityManager.updateTerminalSize(size);
    });

    // Theme events
    this.themeManager.on('themeChanged', (event) => {
      this.onThemeChanged(event);
    });

    // Accessibility events
    this.accessibilityManager.on('focusChanged', (focus) => {
      this.onFocusChanged(focus);
    });

    // Audio events
    this.audioSystem.on('soundPlayed', (event) => {
      console.log(`[Audio] Playing: ${event.type}`);
    });
  }

  /**
   * Handle keyboard input
   */
  private handleKeyPress(key: string): void {
    switch (key) {
      case 'q':
      case 'Q':
        this.exit();
        break;

      case 't':
      case 'T':
        this.nextTheme();
        break;

      case 'l':
      case 'L':
        this.nextLocale();
        break;

      case 'a':
      case 'A':
        this.toggleAccessibility();
        break;

      case 's':
      case 'S':
        this.toggleAudio();
        break;

      case 'n':
      case 'N':
        this.toggleAnimations();
        break;

      case 'u':
      case 'U':
        this.toggleUnicodeSupport();
        break;

      case 'h':
      case 'H':
        this.showHelp();
        break;

      case '1':
        this.setAccessibilityMode('high-contrast');
        break;

      case '2':
        this.setAccessibilityMode('reduced-motion');
        break;

      case '3':
        this.setAccessibilityMode('screen-reader');
        break;

      case '4':
        this.setAccessibilityMode('color-blind');
        break;

      default:
        this.handleTextInput(key);
    }

    this.render();
  }

  /**
   * Handle text input
   */
  private handleTextInput(text: string): void {
    // Handle Unicode text
    if (this.themeManager.getCurrentTheme().font.unicodeSupport) {
      const width = TextUtils.getStringWidth(text);
      console.log(`Input: "${text}" (Unicode width: ${width})`);
    }

    // Play input sound
    this.audioSystem.playCue('select');
  }

  /**
   * Exit demo
   */
  private exit(): void {
    this.terminalController.restore();
    this.terminalController.disableRawMode();
    process.exit(0);
  }

  /**
   * Switch to next theme
   */
  private nextTheme(): void {
    const themes = this.themeManager.getAllThemes();
    this.demoState.currentTheme = (this.demoState.currentTheme + 1) % themes.length;
    this.themeManager.setTheme(themes[this.demoState.currentTheme].name);
    this.audioSystem.playCue('success');
  }

  /**
   * Switch to next locale
   */
  private nextLocale(): void {
    const locales: Locale[] = ['en', 'es', 'fr', 'de', 'ja', 'ar'];
    this.demoState.currentLocale = (this.demoState.currentLocale + 1) % locales.length;
    this.i18nSystem.setLocale(locales[this.demoState.currentLocale]);
    this.audioSystem.playCue('navigation');
  }

  /**
   * Toggle accessibility features
   */
  private toggleAccessibility(): void {
    const current = this.accessibilityManager.getConfig();
    this.accessibilityManager.updateConfig({
      focusVisible: !current.focusVisible,
      showHints: !current.showHints
    });
    this.audioSystem.playCue('notification');
  }

  /**
   * Toggle audio
   */
  private toggleAudio(): void {
    const current = this.audioSystem.getConfig();
    this.audioSystem.setEnabled(!current.enabled);
    this.audioSystem.playCue('select');
  }

  /**
   * Toggle animations
   */
  private toggleAnimations(): void {
    const current = this.animationSystem.getConfig();
    this.animationSystem.setEnabled(!current.enabled);
    this.audioSystem.playCue('notification');
  }

  /**
   * Toggle Unicode support
   */
  private toggleUnicodeSupport(): void {
    const currentTheme = this.themeManager.getCurrentTheme();
    currentTheme.font.unicodeSupport = !currentTheme.font.unicodeSupport;
    this.themeManager.registerTheme(currentTheme);
    this.audioSystem.playCue('notification');
  }

  /**
   * Show help
   */
  private showHelp(): void {
    const helpText = [
      '',
      this.themeManager.applyThemeToText('=== DEMO HELP ===', 'heading'),
      '',
      'Theme Controls:',
      '  t - Switch themes',
      '  l - Change locale',
      '',
      'Accessibility:',
      '  a - Toggle accessibility',
      '  1 - High contrast mode',
      '  2 - Reduced motion',
      '  3 - Screen reader mode',
      '  4 - Color blind mode',
      '',
      'System:',
      '  s - Toggle audio',
      '  n - Toggle animations',
      '  u - Toggle Unicode support',
      '  h - Show help',
      '  q - Quit',
      '',
      'Type text to test Unicode support'
    ];

    this.accessibilityManager.showHint({
      title: this.i18nSystem.t('ui.help'),
      description: this.i18nSystem.t('ui.help', {}),
      shortcuts: [
        { key: 't', action: this.i18nSystem.t('navigation.next') },
        { key: 'l', action: this.i18nSystem.t('navigation.next') },
        { key: 'q', action: this.i18nSystem.t('navigation.back') }
      ]
    });

    helpText.forEach(line => {
      process.stdout.write(line + '\n');
    });
  }

  /**
   * Set accessibility mode
   */
  private setAccessibilityMode(mode: string): void {
    switch (mode) {
      case 'high-contrast':
        this.accessibilityManager.setHighContrastMode(true);
        break;
      case 'reduced-motion':
        this.accessibilityManager.setReducedMotion(true);
        this.animationSystem.setEnabled(false);
        break;
      case 'screen-reader':
        this.accessibilityManager.setScreenReaderMode(true);
        break;
      case 'color-blind':
        this.accessibilityManager.setColorBlindMode('protanopia');
        break;
    }
    this.audioSystem.playCue('success');
  }

  /**
   * Handle theme change
   */
  private onThemeChanged(event: any): void {
    console.log(`Theme changed to: ${event.newTheme.name}`);

    // Update accessibility manager
    this.accessibilityManager.updateConfig({
      highContrast: event.newTheme.accessibility.highContrast,
      reducedMotion: event.newTheme.accessibility.reducedMotion
    });
  }

  /**
   * Handle focus change
   */
  private onFocusChanged(focus: any): void {
    console.log(`Focus changed to: ${focus.component} at (${focus.x}, ${focus.y})`);
  }

  /**
   * Main render function
   */
  private render(): void {
    const size = this.terminalController.getTerminalSize();
    this.terminalController.clearScreen();

    // Render main demo interface
    this.renderHeader();
    this.renderThemeInfo();
    this.renderAccessibilityInfo();
    this.renderLocaleInfo();
    this.renderUnicodeDemo();
    this.renderFooter();

    // Render accessibility features
    this.renderAccessibilityFeatures();
  }

  /**
   * Render header
   */
  private renderHeader(): void {
    const theme = this.themeManager.getCurrentTheme();

    // Draw header with theme colors
    process.stdout.write(AnsiUtils.moveCursor(1, 1));
    process.stdout.write(this.themeManager.applyColor('╔', 'border'));
    process.stdout.write(this.themeManager.applyColor('═'.repeat(size.width - 2), 'border'));
    process.stdout.write(this.themeManager.applyColor('╗', 'border'));

    process.stdout.write(AnsiUtils.moveCursor(1, 2));
    process.stdout.write(this.themeManager.applyColor('║', 'border'));
    process.stdout.write(this.themeManager.applyThemeToText(' TUI Theming & Accessibility Demo ', 'heading'));
    process.stdout.write(this.themeManager.applyColor('║', 'border'));

    process.stdout.write(AnsiUtils.moveCursor(1, 3));
    process.stdout.write(this.themeManager.applyColor('╚', 'border'));
    process.stdout.write(this.themeManager.applyColor('═'.repeat(size.width - 2), 'border'));
    process.stdout.write(this.themeManager.applyColor('╝', 'border'));

    process.stdout.write('\n');
  }

  /**
   * Render theme information
   */
  private renderThemeInfo(): void {
    const theme = this.themeManager.getCurrentTheme();

    process.stdout.write(AnsiUtils.moveCursor(1, 5));
    process.stdout.write(this.themeManager.applyThemeToText('Current Theme:', 'label'));
    process.stdout.write(' ' + theme.name + '\n');

    process.stdout.write(AnsiUtils.moveCursor(1, 6));
    process.stdout.write(this.themeManager.applyThemeToText('Description:', 'label'));
    process.stdout.write(' ' + (theme.description || '') + '\n');

    process.stdout.write(AnsiUtils.moveCursor(1, 7));
    process.stdout.write(this.themeManager.applyThemeToText('Color Palette:', 'label'));
    process.stdout.write(' ');

    // Show color palette preview
    const colors = ['primary', 'success', 'warning', 'error', 'info'];
    colors.forEach(colorKey => {
      const color = theme.colors[colorKey as keyof typeof theme.colors] as number;
      process.stdout.write(this.themeManager.applyColor('█', colorKey));
    });
    process.stdout.write('\n');
  }

  /**
   * Render accessibility information
   */
  private renderAccessibilityInfo(): void {
    const config = this.accessibilityManager.getConfig();

    process.stdout.write(AnsiUtils.moveCursor(1, 9));
    process.stdout.write(this.themeManager.applyThemeToText('Accessibility:', 'label'));
    process.stdout.write(' ');

    const features = [];
    if (config.focusVisible) features.push('Focus');
    if (config.highContrast) features.push('High Contrast');
    if (config.reducedMotion) features.push('Reduced Motion');
    if (config.screenReader) features.push('Screen Reader');
    if (config.showHints) features.push('Hints');

    process.stdout.write(features.join(', ') || 'None\n');
  }

  /**
   * Render locale information
   */
  private renderLocaleInfo(): void {
    const locale = this.i18nSystem.getCurrentLocale();
    const localeConfig = this.i18nSystem.getConfig();

    process.stdout.write(AnsiUtils.moveCursor(1, 11));
    process.stdout.write(this.themeManager.applyThemeToText('Locale:', 'label'));
    process.stdout.write(' ' + locale + ' ');
    process.stdout.write(this.themeManager.applyThemeToText(`(${localeConfig.nativeName})`, 'label'));

    process.stdout.write('\n');
    process.stdout.write(AnsiUtils.moveCursor(1, 12));
    process.stdout.write(this.themeManager.applyThemeToText('Direction:', 'label'));
    process.stdout.write(' ' + localeConfig.direction + '\n');
    process.stdout.write(AnsiUtils.moveCursor(1, 13));
    process.stdout.write(this.themeManager.applyThemeToText('Format:', 'label'));
    process.stdout.write(' ' + localeConfig.dateOrder.join('-') + ', ' + localeConfig.timeFormat + '\n');
  }

  /**
   * Render Unicode demo
   */
  private renderUnicodeDemo(): void {
    const theme = this.themeManager.getCurrentTheme();

    process.stdout.write(AnsiUtils.moveCursor(1, 15));
    process.stdout.write(this.themeManager.applyThemeToText('Unicode Support:', 'label'));
    process.stdout.write(' ' + (theme.font.unicodeSupport ? '✓' : '✗') + '\n');

    // Unicode text demonstration
    const unicodeTexts = [
      'English: Hello World',
      'Japanese: こんにちは世界',
      'Arabic: مرحبا بالعالم',
      'Russian: Привет мир',
      'Emoji: 🚀🌍💻⚡'
    ];

    if (theme.font.unicodeSupport) {
      process.stdout.write(AnsiUtils.moveCursor(1, 17));
      process.stdout.write(this.themeManager.applyThemeToText('Multilingual Text:', 'label'));
      process.stdout.write('\n');

      unicodeTexts.forEach(text => {
        process.stdout.write(AnsiUtils.moveCursor(1, 18 + unicodeTexts.indexOf(text)));
        process.stdout.write(text);
        process.stdout.write(' (width: ' + TextUtils.getStringWidth(text) + ')\n');
      });
    }
  }

  /**
   * Render footer
   */
  private renderFooter(): void {
    const size = this.terminalController.getTerminalSize();

    process.stdout.write(AnsiUtils.moveCursor(1, size.height - 4));
    process.stdout.write(this.themeManager.applyThemeToText('Controls:', 'label'));
    process.stdout.write(' t=theme, l=locale, a=accessibility, s=audio, n=animations, h=help, q=quit\n');

    process.stdout.write(AnsiUtils.moveCursor(1, size.height - 3));
    process.stdout.write(this.themeManager.applyThemeToText('Accessibility:', 'label'));
    process.stdout.write(' 1=HC, 2=RM, 3=SR, 4=CB');

    // Draw border
    process.stdout.write(AnsiUtils.moveCursor(1, size.height - 1));
    process.stdout.write(this.themeManager.applyColor('╚', 'border'));
    process.stdout.write(this.themeManager.applyColor('═'.repeat(size.width - 2), 'border'));
    process.stdout.write(this.themeManager.applyColor('╝', 'border'));
  }

  /**
   * Render accessibility features
   */
  private renderAccessibilityFeatures(): void {
    // Render focus outline if enabled
    const focusOutline = this.accessibilityManager.renderFocusOutline();
    if (focusOutline) {
      process.stdout.write(focusOutline);
    }

    // Render hint bar if visible
    const hintBar = this.accessibilityManager.renderHintBar();
    if (hintBar) {
      process.stdout.write(hintBar);
    }
  }

  /**
   * Start the demo
   */
  start(): void {
    console.log('Starting Theming & Accessibility Demo...');

    // Set initial focus
    this.accessibilityManager.setFocus({
      x: 5,
      y: 1,
      width: 10,
      height: 1,
      component: 'header',
      id: 'header'
    });

    // Initial render
    this.render();

    // Show initial hint
    this.accessibilityManager.showHint({
      title: this.i18nSystem.t('ui.welcome'),
      description: this.i18nSystem.t('ui.start'),
      shortcuts: [
        { key: 'h', action: this.i18nSystem.t('ui.help') },
        { key: 't', action: this.i18nSystem.t('navigation.next') }
      ],
      timeout: 5000
    });
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new ThemedTUIDemo();
  demo.start();
}