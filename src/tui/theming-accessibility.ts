/**
 * Theming, Accessibility & UX Module Exports
 *
 * This file exports all the new theming, accessibility, and enhanced UX features
 * for the TUI framework, providing a comprehensive theming system with internationalization,
 * accessibility support, and responsive design capabilities.
 */

// Core theming system
export {
  ThemeManagerV2 as ThemeManager,
  type EnhancedTheme,
  type ColorScheme,
  type ComponentTokens,
  type ResponsiveTypography,
  type ResponsiveSpacing,
  type AnimationConfig,
  type BorderStyle,
  type BorderChars,
  type PaletteDetection,
  type ThemeChangeEvent
} from './theme-v2.js';

// Unicode and text utilities
export {
  TextUtils,
  type TextSegment,
  type LayoutOptions,
  type BidiProperty
} from './text-utils.js';

// Accessibility features
export {
  AccessibilityManager,
  type AccessibilityConfig,
  type FocusOutlineStyle,
  type HintBarPosition,
  type AudioCueType,
  type AudioCue,
  type HintContent,
  type FocusState
} from './accessibility.js';

// Audio system
export {
  AudioSystem,
  type AudioSystemConfig,
  type SoundConfig,
  type AudioChannel
} from './audio-system.js';

// Animation system
export {
  AnimationSystem,
  type AnimationType,
  type EasingFunction,
  type AnimationConfig as AnimationConfigType,
  type AnimationKeyframe,
  type TransformProperties,
  type AnimationState
} from './animation-system.js';

// Internationalization
export {
  I18nSystem,
  type Locale,
  type TextDirection,
  type PluralCategory,
  type TranslationMap,
  type LocaleConfig
} from './i18n.js';

// Enhanced exports for backward compatibility
export {
  type Theme,
  type ColorScheme as LegacyColorScheme,
  type BorderStyle as LegacyBorderStyle,
  type Typography,
  type Spacing,
  type ThemeManager as LegacyThemeManager,
  LIGHT_THEME,
  DARK_THEME,
  HIGH_CONTRAST_THEME,
  MINIMAL_THEME
} from './theme.js';

// Enhanced terminal controller integration
export { TerminalController } from './terminal-controller.js';

// Utility functions for easy integration
export const ThemingUtils = {
  /**
   * Initialize the theming system
   */
  initializeThemeSystem(terminalController?: any) {
    const themeManager = ThemeManagerV2.getInstance();

    if (terminalController) {
      themeManager.setTerminalCapabilities(terminalController.capabilities);
    }

    return themeManager;
  },

  /**
   * Initialize accessibility system
   */
  initializeAccessibilitySystem(terminalSize: any) {
    return new AccessibilityManager(terminalSize);
  },

  /**
   * Initialize audio system
   */
  initializeAudioSystem() {
    return new AudioSystem();
  },

  /**
   * Initialize animation system
   */
  initializeAnimationSystem() {
    return new AnimationSystem();
  },

  /**
   * Initialize i18n system
   */
  initializeI18nSystem() {
    return new I18nSystem();
  },

  /**
   * Create a complete accessibility-ready theme
   */
  createAccessibilityTheme(baseTheme: string, accessibilityConfig: any) {
    const themeManager = ThemeManagerV2.getInstance();
    const enhancedTheme = themeManager.getTheme(baseTheme);

    if (!enhancedTheme) {
      throw new Error(`Base theme '${baseTheme}' not found`);
    }

    // Apply accessibility enhancements
    const accessibleTheme = {
      ...enhancedTheme,
      accessibility: {
        ...enhancedTheme.accessibility,
        ...accessibilityConfig
      },
      colors: {
        ...enhancedTheme.colors,
        // Enhance contrast for accessibility
        accessibleFocus: enhancedTheme.colors.primary,
        accessibleHover: enhancedTheme.colors.secondary,
        highContrast: accessibilityConfig.highContrast || false
      }
    };

    themeManager.registerTheme(accessibleTheme);
    return accessibleTheme;
  },

  /**
   * Set up complete theming and accessibility stack
   */
  setupCompleteSystem(terminalController?: any) {
    const terminalSize = terminalController
      ? terminalController.getTerminalSize()
      : { width: 80, height: 24 };

    const themeManager = this.initializeThemeSystem(terminalController);
    const accessibilityManager = this.initializeAccessibilitySystem(terminalSize);
    const audioSystem = this.initializeAudioSystem();
    const animationSystem = this.initializeAnimationSystem();
    const i18nSystem = this.initializeI18nSystem();

    return {
      themeManager,
      accessibilityManager,
      audioSystem,
      animationSystem,
      i18nSystem,
      systems: {
        theming: themeManager,
        accessibility: accessibilityManager,
        audio: audioSystem,
        animation: animationSystem,
        i18n: i18nSystem
      }
    };
  }
};

// Default exports for easy importing
export default {
  ThemeManager: ThemeManagerV2,
  AccessibilityManager,
  AudioSystem,
  AnimationSystem,
  I18nSystem,
  TextUtils,
  ThemingUtils
};

// Convenience re-exports
export {
  // Main classes
  ThemeManagerV2,
  AccessibilityManager,
  AudioSystem,
  AnimationSystem,
  I18nSystem,
  TextUtils,

  // Core types
  EnhancedTheme,
  ColorScheme,
  ComponentTokens,
  AccessibilityConfig,
  Locale,
  AnimationType,
  AnimationConfig as AnimationConfigType,
  PaletteDetection,

  // Utilities
  ThemingUtils
};