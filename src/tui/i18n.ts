import { EventEmitter } from 'events';

/**
 * Supported locales
 */
export type Locale = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru' | 'ja' | 'ko' | 'zh' | 'ar' | 'he' | 'hi' | 'tr' | 'fa' | 'ur';

/**
 * Text direction
 */
export type TextDirection = 'ltr' | 'rtl';

/**
 * Pluralization rules
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

/**
 * Translation mapping
 */
export interface TranslationMap {
  [key: string]: string | TranslationMap;
}

/**
 * Locale configuration
 */
export interface LocaleConfig {
  locale: Locale;
  name: string;
  nativeName: string;
  direction: TextDirection;
  currency: string;
  dateOrder: string[]; // ['day', 'month', 'year'] or other variations
  timeFormat: '12h' | '24h';
  decimalSeparator: string;
  thousandsSeparator: string;
  weekStartsOn: 'sunday' | 'monday';
  supportedLocales: Locale[];
  fallbackLocale: Locale;
}

/**
 * Internationalization system
 */
export class I18nSystem extends EventEmitter {
  private currentLocale: Locale;
  private config: LocaleConfig;
  private translations: Map<Locale, TranslationMap>;
  private plurals: Map<Locale, (n: number) => PluralCategory>;
  private fallbackTranslations: TranslationMap;

  constructor() {
    super();
    this.translations = new Map();
    this.plurals = new Map();

    // Default configuration
    this.currentLocale = 'en';
    this.config = {
      locale: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      currency: 'USD',
      dateOrder: ['month', 'day', 'year'],
      timeFormat: '12h',
      decimalSeparator: '.',
      thousandsSeparator: ',',
      weekStartsOn: 'sunday',
      supportedLocales: this.getDefaultSupportedLocales(),
      fallbackLocale: 'en'
    };

    // Initialize default translations
    this.loadDefaultTranslations();
    this.initializePluralRules();
    this.setupEventListeners();
  }

  /**
   * Get default supported locales
   */
  private getDefaultSupportedLocales(): Locale[] {
    return ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'ar', 'he', 'hi', 'tr', 'fa', 'ur'];
  }

  /**
   * Load default translations
   */
  private loadDefaultTranslations(): void {
    // English default translations
    const englishTranslations: TranslationMap = {
      common: {
        ok: 'OK',
        cancel: 'Cancel',
        yes: 'Yes',
        no: 'No',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        next: 'Next',
        previous: 'Previous',
        search: 'Search',
        filter: 'Filter',
        sort: 'Sort',
        export: 'Export',
        import: 'Import',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Information',
        help: 'Help',
        about: 'About',
        settings: 'Settings',
        profile: 'Profile',
        logout: 'Logout',
        login: 'Login',
        register: 'Register',
        reset: 'Reset',
        submit: 'Submit',
        back: 'Back',
        forward: 'Forward',
        refresh: 'Refresh',
        home: 'Home',
        dashboard: 'Dashboard',
        users: 'Users',
        permissions: 'Permissions',
        roles: 'Roles',
        applications: 'Applications',
        documents: 'Documents',
        analytics: 'Analytics',
        reports: 'Reports',
        configuration: 'Configuration'
      },
      navigation: {
        home: 'Home',
        dashboard: 'Dashboard',
        settings: 'Settings',
        logout: 'Logout',
        back: 'Back',
        forward: 'Forward',
        up: 'Up',
        down: 'Down',
        left: 'Left',
        right: 'Right'
      },
      errors: {
        notFound: 'Not Found',
        unauthorized: 'Unauthorized',
        forbidden: 'Forbidden',
        serverError: 'Server Error',
        networkError: 'Network Error',
        validationError: 'Validation Error',
        requiredField: 'This field is required',
        invalidFormat: 'Invalid format',
        tooShort: 'Too short',
        tooLong: 'Too long',
        invalidEmail: 'Invalid email address',
        invalidPassword: 'Invalid password',
        fieldAlreadyExists: 'Field already exists',
        confirmDelete: 'Are you sure you want to delete this?'
      },
      ui: {
        loading: 'Loading...',
        pleaseWait: 'Please wait...',
        saved: 'Saved successfully',
        deleted: 'Deleted successfully',
        updated: 'Updated successfully',
        created: 'Created successfully',
        confirm: 'Confirm',
        delete: 'Delete',
        edit: 'Edit',
        view: 'View',
        copy: 'Copy',
        paste: 'Paste',
        cut: 'Cut',
        selectAll: 'Select All',
        deselectAll: 'Deselect All',
        searchPlaceholder: 'Search...',
        filterPlaceholder: 'Filter...',
        sortAscending: 'Sort A-Z',
        sortDescending: 'Sort Z-A',
        sortNone: 'No Sort',
        showAll: 'Show All',
        showLess: 'Show Less',
        showMore: 'Show More',
        collapse: 'Collapse',
        expand: 'Expand',
        minimize: 'Minimize',
        maximize: 'Maximize',
        fullscreen: 'Fullscreen',
        exitFullscreen: 'Exit Fullscreen'
      },
      time: {
        second: 'second',
        seconds: 'seconds',
        minute: 'minute',
        minutes: 'minutes',
        hour: 'hour',
        hours: 'hours',
        day: 'day',
        days: 'days',
        week: 'week',
        weeks: 'weeks',
        month: 'month',
        months: 'months',
        year: 'year',
        years: 'years',
        ago: 'ago',
        yesterday: 'yesterday',
        today: 'today',
        tomorrow: 'tomorrow',
        justNow: 'just now',
        inFuture: 'in'
      }
    };

    this.translations.set('en', englishTranslations);
    this.fallbackTranslations = englishTranslations;
  }

  /**
   * Initialize plural rules
   */
  private initializePluralRules(): void {
    // English plural rules
    this.plurals.set('en', (n: number): PluralCategory => {
      if (n === 1) return 'one';
      return 'other';
    });

    // Spanish plural rules
    this.plurals.set('es', (n: number): PluralCategory => {
      if (n === 1) return 'one';
      return 'other';
    });

    // French plural rules
    this.plurals.set('fr', (n: number): PluralCategory => {
      if (n === 0 || n === 1) return 'one';
      return 'other';
    });

    // German plural rules
    this.plurals.set('de', (n: number): PluralCategory => {
      if (n === 1) return 'one';
      return 'other';
    });

    // Russian plural rules (special case)
    this.plurals.set('ru', (n: number): PluralCategory => {
      const mod10 = n % 10;
      const mod100 = n % 100;

      if (mod10 === 1 && mod100 !== 11) return 'one';
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'few';
      if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 10 && mod100 <= 20)) return 'many';
      return 'other';
    });

    // Arabic plural rules (complex)
    this.plurals.set('ar', (n: number): PluralCategory => {
      if (n === 0) return 'zero';
      if (n === 1) return 'one';
      if (n === 2) return 'two';
      if (n >= 3 && n <= 10) return 'few';
      return 'other';
    });

    // Japanese and Chinese don't pluralize
    this.plurals.set('ja', () => 'other');
    this.plurals.set('ko', () => 'other');
    this.plurals.set('zh', () => 'other');
  }

  /**
   * Set current locale
   */
  setLocale(locale: Locale): void {
    if (!this.config.supportedLocales.includes(locale)) {
      throw new Error(`Locale '${locale}' is not supported`);
    }

    const oldLocale = this.currentLocale;
    this.currentLocale = locale;

    // Update configuration for locale
    this.updateLocaleConfig(locale);

    this.emit('localeChanged', { oldLocale, newLocale: locale });
  }

  /**
   * Update locale configuration
   */
  private updateLocaleConfig(locale: Locale): void {
    const localeConfigs: Record<Locale, Partial<LocaleConfig>> = {
      en: { direction: 'ltr', currency: 'USD', decimalSeparator: '.', thousandsSeparator: ',' },
      es: { direction: 'ltr', currency: 'EUR', decimalSeparator: ',', thousandsSeparator: '.' },
      fr: { direction: 'ltr', currency: 'EUR', decimalSeparator: ',', thousandsSeparator: ' ' },
      de: { direction: 'ltr', currency: 'EUR', decimalSeparator: ',', thousandsSeparator: '.' },
      it: { direction: 'ltr', currency: 'EUR', decimalSeparator: ',', thousandsSeparator: '.' },
      pt: { direction: 'ltr', currency: 'EUR', decimalSeparator: ',', thousandsSeparator: '.' },
      ru: { direction: 'ltr', currency: 'RUB', decimalSeparator: ',', thousandsSeparator: ' ' },
      ja: { direction: 'ltr', currency: 'JPY', decimalSeparator: '.', thousandsSeparator: ',' },
      ko: { direction: 'ltr', currency: 'KRW', decimalSeparator: '.', thousandsSeparator: ',' },
      zh: { direction: 'ltr', currency: 'CNY', decimalSeparator: '.', thousandsSeparator: ',' },
      ar: { direction: 'rtl', currency: 'SAR', decimalSeparator: '.', thousandsSeparator: ',' },
      he: { direction: 'rtl', currency: 'ILS', decimalSeparator: '.', thousandsSeparator: ',' },
      hi: { direction: 'ltr', currency: 'INR', decimalSeparator: '.', thousandsSeparator: ',' },
      tr: { direction: 'ltr', currency: 'TRY', decimalSeparator: ',', thousandsSeparator: '.' },
      fa: { direction: 'rtl', currency: 'IRR', decimalSeparator: '.', thousandsSeparator: ',' },
      ur: { direction: 'rtl', currency: 'PKR', decimalSeparator: '.', thousandsSeparator: ',' }
    };

    this.config = { ...this.config, ...localeConfigs[locale] };
  }

  /**
   * Get translation for a key
   */
  t(key: string, replacements?: Record<string, any>, options?: { plural?: number; count?: number }): string {
    let translation = this.findTranslation(key);

    // Handle plurals
    if (options?.count !== undefined) {
      const pluralCategory = this.getPluralCategory(options.count);
      const pluralKey = `${key}.${pluralCategory}`;
      const pluralTranslation = this.findTranslation(pluralKey);

      if (pluralTranslation) {
        translation = pluralTranslation;
      } else if (translation && translation !== key) {
        // Apply plural replacements to main translation
        translation = this.applyReplacements(translation, { count: options.count });
      }
    }

    // Apply replacements
    if (replacements && translation) {
      translation = this.applyReplacements(translation, replacements);
    }

    // Use fallback if translation not found
    if (!translation) {
      translation = this.findTranslationInFallback(key);
      if (replacements && translation) {
        translation = this.applyReplacements(translation, replacements);
      }
    }

    return translation || key;
  }

  /**
   * Find translation in current locale
   */
  private findTranslation(key: string): string | undefined {
    const translations = this.translations.get(this.currentLocale);
    if (!translations) return undefined;

    const keys = key.split('.');
    let current: any = translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Find translation in fallback locale
   */
  private findTranslationInFallback(key: string): string | undefined {
    const fallbackLocale = this.config.fallbackLocale;
    if (fallbackLocale === this.currentLocale) return undefined;

    const translations = this.translations.get(fallbackLocale);
    if (!translations) return undefined;

    const keys = key.split('.');
    let current: any = translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Apply replacements to translation
   */
  private applyReplacements(translation: string, replacements: Record<string, any>): string {
    let result = translation;

    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(placeholder, String(value));
    }

    return result;
  }

  /**
   * Get plural category for number
   */
  private getPluralCategory(n: number): PluralCategory {
    const pluralFunction = this.plurals.get(this.currentLocale);
    if (!pluralFunction) return 'other';

    return pluralFunction(n);
  }

  /**
   * Add translations for a locale
   */
  addTranslations(locale: Locale, translations: TranslationMap): void {
    if (!this.translations.has(locale)) {
      this.translations.set(locale, {});
    }

    const existingTranslations = this.translations.get(locale)!;
    this.deepMerge(existingTranslations, translations);

    this.emit('translationsAdded', { locale, translations });
  }

  /**
   * Deep merge utility
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Load translations from file
   */
  async loadTranslationsFromFile(locale: Locale, filePath: string): Promise<void> {
    try {
      // This would normally use fs.readFile
      // For now, we'll simulate loading
      console.log(`[I18n] Loading translations for ${locale} from ${filePath}`);

      // In a real implementation, you would:
      // const fs = require('fs');
      // const translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      // this.addTranslations(locale, translations);

    } catch (error) {
      console.error(`[I18n] Failed to load translations: ${error}`);
      throw error;
    }
  }

  /**
   * Format date according to locale
   */
  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...this.getDateFormatOptions()
    };

    return date.toLocaleDateString(this.getLocaleName(), options);
  }

  /**
   * Format time according to locale
   */
  formatTime(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      hour12: this.config.timeFormat === '12h'
    };

    return date.toLocaleTimeString(this.getLocaleName(), options);
  }

  /**
   * Format number according to locale
   */
  formatNumber(number: number): string {
    return new Intl.NumberFormat(this.getLocaleName(), {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number);
  }

  /**
   * Format currency according to locale
   */
  formatCurrency(amount: number, currency?: string): string {
    const currencyCode = currency || this.config.currency;

    return new Intl.NumberFormat(this.getLocaleName(), {
      style: 'currency',
      currency: currencyCode
    }).format(amount);
  }

  /**
   * Format relative time
   */
  formatRelativeTime(value: number, unit: string): string {
    const translations = this.translations.get(this.currentLocale)?.time || this.fallbackTranslations.time || {};
    const key = value === 1 ? unit : unit + 's';
    const translatedUnit = translations[key] || unit;

    const relativeTime = this.t('time.ago');
    const futureTime = this.t('time.inFuture');

    return value < 0
      ? `${Math.abs(value)} ${translatedUnit} ${futureTime}`
      : `${value} ${translatedUnit} ${relativeTime}`;
  }

  /**
   * Get locale configuration
   */
  getConfig(): LocaleConfig {
    return { ...this.config };
  }

  /**
   * Get current locale
   */
  getCurrentLocale(): Locale {
    return this.currentLocale;
  }

  /**
   * Get locale name for Intl API
   */
  private getLocaleName(): string {
    // Convert our locale codes to Intl format
    const localeMap: Record<Locale, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-BR',
      ru: 'ru-RU',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
      ar: 'ar-SA',
      he: 'he-IL',
      hi: 'hi-IN',
      tr: 'tr-TR',
      fa: 'fa-IR',
      ur: 'ur-PK'
    };

    return localeMap[this.currentLocale];
  }

  /**
   * Get date format options
   */
  private getDateFormatOptions(): Intl.DateTimeFormatOptions {
    const [year, month, day] = this.config.dateOrder;

    const options: Intl.DateTimeFormatOptions = {};

    if (year === 'numeric') options.year = 'numeric';
    if (year === '2-digit') options.year = '2-digit';

    if (month === 'numeric') options.month = 'numeric';
    if (month === '2-digit') options.month = '2-digit';
    if (month === 'long') options.month = 'long';
    if (month === 'short') options.month = 'short';

    if (day === 'numeric') options.day = 'numeric';
    if (day === '2-digit') options.day = '2-digit';

    return options;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for locale change events from other systems
    this.on('localeRequested', (locale: Locale) => {
      this.setLocale(locale);
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.translations.clear();
    this.plurals.clear();
    this.removeAllListeners();
  }
}