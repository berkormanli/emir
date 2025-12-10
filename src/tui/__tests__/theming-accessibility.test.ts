import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeManagerV2, EnhancedTheme, ComponentTokens } from '../theme-v2.js';
import { AccessibilityManager, AccessibilityConfig } from '../accessibility.js';
import { AudioSystem, AudioSystemConfig } from '../audio-system.js';
import { AnimationSystem, AnimationSystemConfig } from '../animation-system.js';
import { I18nSystem, Locale } from '../i18n.js';
import { TextUtils } from '../text-utils.js';

describe('Theming, Accessibility & UX System', () => {
  let themeManager: ThemeManagerV2;
  let accessibilityManager: AccessibilityManager;
  let audioSystem: AudioSystem;
  let animationSystem: AnimationSystem;
  let i18nSystem: I18nSystem;

  beforeEach(() => {
    // Reset singletons for testing
    themeManager = ThemeManagerV2.getInstance();
    accessibilityManager = new AccessibilityManager({ width: 80, height: 24 });
    audioSystem = new AudioSystem();
    animationSystem = new AnimationSystem();
    i18nSystem = new I18nSystem();
  });

  afterEach(() => {
    // Clean up
    accessibilityManager.cleanup();
    audioSystem.cleanup();
    animationSystem.cleanup();
    i18nSystem.cleanup();
  });

  describe('Theme System', () => {
    it('should register and retrieve themes', () => {
      const testTheme: EnhancedTheme = {
        name: 'Test Theme',
        description: 'A test theme',
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
          muted: 8
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
          author: 'Test',
          license: 'MIT',
          tags: ['test'],
          darkMode: false
        }
      };

      themeManager.registerTheme(testTheme);
      const retrievedTheme = themeManager.getTheme('Test Theme');
      expect(retrievedTheme).toBeDefined();
      expect(retrievedTheme?.name).toBe('Test Theme');
    });

    it('should switch themes dynamically', () => {
      const initialTheme = themeManager.getCurrentTheme();
      expect(initialTheme).toBeDefined();

      // Set to a different theme by name (should work with registered themes)
      const themes = themeManager.getAllThemes();
      if (themes.length > 1) {
        themeManager.setTheme(themes[1].name);
        const currentTheme = themeManager.getCurrentTheme();
        expect(currentTheme.name).toBe(themes[1].name);
      }
    });

    it('should degrade colors for limited color capabilities', () => {
      // Mock terminal with limited color support
      themeManager.setTerminalCapabilities({
        colors: 16,
        unicode: true,
        mouse: false,
        alternateScreen: true
      });

      const degraded = themeManager['degradeColors']({
        primary: 196, // Bright red (16-color palette)
        secondary: 21, // Bright cyan (256-color palette)
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
        muted: 8
      }, 16);

      expect(degraded.primary).toBe(1); // Should map to basic red
      expect(degraded.secondary).toBe(6); // Should map to basic cyan
    });

    it('should create custom themes', () => {
      const customTheme = themeManager.createCustomTheme(
        'Custom Test',
        'Dark',
        {
          colors: {
            primary: 12 // Light blue
          },
          typography: {
            button: {
              bold: false
            }
          }
        }
      );

      expect(customTheme.name).toBe('Custom Test');
      expect(customTheme.colors.primary).toBe(12);
      expect(customTheme.typography.button.bold).toBe(false);
    });
  });

  describe('Accessibility System', () => {
    it('should initialize with default configuration', () => {
      const config = accessibilityManager.getConfig();
      expect(config.focusVisible).toBe(true);
      expect(config.showHints).toBe(true);
      expect(config.audioEnabled).toBe(true);
    });

    it('should update configuration dynamically', () => {
      accessibilityManager.updateConfig({
        focusVisible: false,
        showHints: false
      });

      const config = accessibilityManager.getConfig();
      expect(config.focusVisible).toBe(false);
      expect(config.showHints).toBe(false);
    });

    it('should handle focus states', () => {
      const focusState = {
        x: 5,
        y: 5,
        width: 10,
        height: 3,
        component: 'test-component',
        id: 'test-focus'
      };

      accessibilityManager.setFocus(focusState);
      const currentFocus = accessibilityManager.getCurrentFocus();
      expect(currentFocus).toEqual(focusState);
    });

    it('should render focus outlines', () => {
      accessibilityManager.setFocus({
        x: 5,
        y: 5,
        width: 10,
        height: 3,
        component: 'test-component',
        id: 'test-focus'
      });

      const outline = accessibilityManager.renderFocusOutline();
      expect(outline).toContain('┌');
      expect(outline).toContain('┐');
      expect(outline).toContain('└');
      expect(outline).toContain('┘');
    });

    it('should show and hide hints', () => {
      const hintContent = {
        title: 'Test Hint',
        description: 'This is a test hint',
        shortcuts: [{ key: 'q', action: 'Quit' }]
      };

      accessibilityManager.showHint(hintContent);
      expect(accessibilityManager['hintVisible']).toBe(true);

      accessibilityManager.hideHint();
      expect(accessibilityManager['hintVisible']).toBe(false);
    });

    it('should handle color blind adjustments', () => {
      const normalColor = 1; // Red
      const adjusted = accessibilityManager.adjustColorsForColorBlindness(normalColor);
      expect(adjusted).toBeDefined();
    });

    it('should enable/disable accessibility features', () => {
      accessibilityManager.setHighContrastMode(true);
      expect(accessibilityManager.getConfig().highContrast).toBe(true);

      accessibilityManager.setReducedMotion(true);
      expect(accessibilityManager.getConfig().reducedMotion).toBe(true);

      accessibilityManager.setScreenReaderMode(true);
      expect(accessibilityManager.getConfig().screenReader).toBe(true);
    });
  });

  describe('Audio System', () => {
    it('should initialize with default configuration', () => {
      const config = audioSystem.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.outputMode).toBe('simulated');
      expect(config.volume).toBe(0.5);
    });

    it('should enable/disable audio system', () => {
      audioSystem.setEnabled(false);
      expect(audioSystem.getConfig().enabled).toBe(false);

      audioSystem.setEnabled(true);
      expect(audioSystem.getConfig().enabled).toBe(true);
    });

    it('should set custom sounds', () => {
      const customSound = {
        frequency: 440,
        duration: 100,
        volume: 0.5,
        waveType: 'sine'
      };

      audioSystem.setCustomSound('focus', customSound);
      expect(audioSystem.getConfig().customSounds.get('focus')).toEqual(customSound);
    });

    it('should handle volume changes', () => {
      audioSystem.setMasterVolume(0.8);
      expect(audioSystem.getConfig().masterVolume).toBe(0.8);

      audioSystem.setChannelVolume('main', 0.6);
      const channel = audioSystem.getChannel('main');
      expect(channel?.volume).toBe(0.6);
    });

    it('should get system capabilities', () => {
      const capabilities = audioSystem.getCapabilities();
      expect(capabilities.outputModes).toContain('simulated');
      expect(capabilities.outputModes).toContain('terminal');
      expect(capabilities.supportedWaveTypes).toContain('sine');
    });
  });

  describe('Animation System', () => {
    it('should create and manage animations', () => {
      const animationConfig = {
        type: 'fade' as const,
        duration: 300,
        easing: 'easeInOut' as const
      };

      const animationState = animationSystem.createAnimation('test-animation', animationConfig);
      expect(animationState.id).toBe('test-animation');
      expect(animationState.type).toBe('fade');
      expect(animationState.isPlaying).toBe(false);
    });

    it('should start and stop animations', () => {
      const animationState = animationSystem.createAnimation('test-start-stop', {
        type: 'pulse',
        duration: 200
      });

      animationSystem.startAnimation('test-start-stop');
      expect(animationState.isPlaying).toBe(true);

      animationSystem.stopAnimation('test-start-stop', false);
      expect(animationState.isPlaying).toBe(false);
    });

    it('should enable/disable animations globally', () => {
      animationSystem.setEnabled(false);
      expect(animationSystem.getConfig().enabled).toBe(false);

      animationSystem.setEnabled(true);
      expect(animationSystem.getConfig().enabled).toBe(true);
    });

    it('should handle animation configurations', () => {
      animationSystem.setConfig({
        defaultDuration: 500,
        maxConcurrentAnimations: 5
      });

      const config = animationSystem.getConfig();
      expect(config.defaultDuration).toBe(500);
      expect(config.maxConcurrentAnimations).toBe(5);
    });
  });

  describe('I18n System', () => {
    it('should initialize with default locale', () => {
      expect(i18nSystem.getCurrentLocale()).toBe('en');
      expect(i18nSystem.getConfig().direction).toBe('ltr');
    });

    it('should set and get translations', () => {
      const translations = {
        common: {
          hello: 'Hello',
          goodbye: 'Goodbye'
        }
      };

      i18nSystem.addTranslations('en', translations);
      const hello = i18nSystem.t('common.hello');
      expect(hello).toBe('Hello');
    });

    it('should handle pluralization', () => {
      const pluralTranslations = {
        items: {
          one: '1 item',
          other: '{{count}} items'
        }
      };

      i18nSystem.addTranslations('en', pluralTranslations);

      const single = i18nSystem.t('items', { count: 1 });
      expect(single).toBe('1 item');

      const multiple = i18nSystem.t('items', { count: 5 });
      expect(multiple).toBe('5 items');
    });

    it('should format dates and times', () => {
      const date = new Date('2024-01-15T10:30:00');

      const formattedDate = i18nSystem.formatDate(date);
      expect(formattedDate).toBeDefined();

      const formattedTime = i18nSystem.formatTime(date);
      expect(formattedTime).toBeDefined();
    });

    it('should format numbers and currency', () => {
      const number = 1234.56;
      const formattedNumber = i18nSystem.formatNumber(number);
      expect(formattedNumber).toBeDefined();

      const formattedCurrency = i18nSystem.formatCurrency(number, 'USD');
      expect(formattedCurrency).toBeDefined();
    });

    it('should switch locales', () => {
      i18nSystem.setLocale('es');
      expect(i18nSystem.getCurrentLocale()).toBe('es');

      i18nSystem.setLocale('fr');
      expect(i18nSystem.getCurrentLocale()).toBe('fr');
    });
  });

  describe('Text Utils', () => {
    it('should calculate string width correctly', () => {
      expect(TextUtils.getStringWidth('hello')).toBe(5);
      expect(TextUtils.getStringWidth('test')).toBe(4);
    });

    it('should handle Unicode characters', () => {
      expect(TextUtils.getStringWidth('こんにちは')).toBe(10); // CJK characters are 2 cells each
      expect(TextUtils.getStringWidth('🚀')).toBe(2); // Emoji takes 2 cells
    });

    it('should detect text direction', () => {
      expect(TextUtils.detectTextDirection('hello world')).toBe('ltr');
      expect(TextUtils.detectTextDirection('مرحبا بالعالم')).toBe('rtl');
    });

    it('should truncate text correctly', () => {
      const longText = 'This is a very long text that should be truncated';
      const truncated = TextUtils.truncateText(longText, 20);
      expect(truncated.length).toBeLessThanOrEqual(20);
      expect(truncated).toContain('…');
    });

    it('should pad text correctly', () => {
      const text = 'test';
      const padded = TextUtils.padText(text, 10, 'left');
      expect(padded.length).toBe(10);
      expect(padded.startsWith('test')).toBe(false); // Left padding should start with spaces
    });

    it('should wrap text to specified width', () => {
      const longText = 'This is a long text that should be wrapped to multiple lines';
      const lines = TextUtils.wrapText(longText, 20);

      expect(lines.length).toBeGreaterThan(1);
      expect(lines[0].length).toBeLessThanOrEqual(20);
    });

    it('should apply bidirectional layout', () => {
      const rtlText = 'مرحبا بالعالم';
      const visualText = TextUtils.applyBidiLayout(rtlText, 'rtl');
      expect(visualText).toBeDefined();
    });

    it('should segment text for mixed content', () => {
      const mixedText = 'Hello مرحبا';
      const segments = TextUtils.segmentText(mixedText);

      expect(segments.length).toBeGreaterThan(0);
      expect(segments[0].direction).toBe('ltr');
    });
  });

  describe('Integration Tests', () => {
    it('should work together across systems', () => {
      // Set up i18n
      i18nSystem.setLocale('en');

      // Set up accessibility
      accessibilityManager.setAudioEnabled(true);

      // Set up audio
      audioSystem.setEnabled(true);

      // Set up animations
      animationSystem.setEnabled(true);

      // Test theme switching with i18n
      const themes = themeManager.getAllThemes();
      if (themes.length > 0) {
        themeManager.setTheme(themes[0].name);
        const currentTheme = themeManager.getCurrentTheme();
        expect(currentTheme).toBeDefined();
      }

      // Test text processing with Unicode
      const unicodeText = 'Hello 🌍 World';
      const width = TextUtils.getStringWidth(unicodeText);
      expect(width).toBeGreaterThan(10);

      // Test accessibility features
      accessibilityManager.setFocus({
        x: 1,
        y: 1,
        width: 10,
        height: 3,
        component: 'integration-test',
        id: 'test'
      });

      const focus = accessibilityManager.getCurrentFocus();
      expect(focus).toBeDefined();

      // Test audio cues
      audioSystem.playCue('select');

      // Test animations
      const animation = animationSystem.createAnimation('integration-animation', {
        type: 'fade',
        duration: 100
      });

      expect(animation).toBeDefined();
    });

    it('should handle terminal capabilities', () => {
      // Mock terminal with limited capabilities
      themeManager.setTerminalCapabilities({
        colors: 16,
        unicode: false,
        mouse: false,
        alternateScreen: false
      });

      // Theme should adapt to limited capabilities
      const currentTheme = themeManager.getCurrentTheme();
      expect(currentTheme).toBeDefined();

      // Text utils should handle non-Unicode
      const nonUnicodeText = 'hello world';
      const width = TextUtils.getStringWidth(nonUnicodeText);
      expect(width).toBe(11);
    });

    it('should respect accessibility preferences', () => {
      // Enable high contrast
      accessibilityManager.setHighContrastMode(true);

      // Enable reduced motion
      accessibilityManager.setReducedMotion(true);
      animationSystem.setEnabled(false);

      // Test that animations are disabled
      const config = animationSystem.getConfig();
      expect(config.enabled).toBe(false);

      // Test high contrast colors
      const highContrastColors = accessibilityManager.getHighContrastColors();
      expect(highContrastColors).toBeDefined();

      // Test reduced motion settings
      expect(accessibilityManager.shouldDisableAnimations()).toBe(true);
    });
  });
});