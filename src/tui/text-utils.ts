/**
 * Unicode width detection and text layout utilities
 */

/**
 * Unicode character categories for width calculation
 */
enum UnicodeCategory {
    Combining = 1,
    Wide = 2,
    Narrow = 3,
    Emoji = 4,
    Control = 5
}

/**
 * Unicode character width map for common characters
 */
const UNICODE_WIDTHS = new Map<string, number>([
    // CJK characters (wide)
    ['\u4e00', 2], // Chinese
    ['\u3042', 2], // Hiragana
    ['\u30a2', 2], // Katakana
    ['\uac00', 2], // Korean
    ['\u0900', 2], // Devanagari

    // Emoji (typically 2 cells, but can be 1)
    ['\u{1F600}', 2], // 😀
    ['\u{1F680}', 2], // 🚀
    ['\u2764\ufe0f', 2], // ❤️
]);

/**
 * Combining characters (zero width)
 */
const COMBINING_CHARS = new Set([
    '\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307',
    '\u0308', '\u0309', '\u030A', '\u030B', '\u030C', '\u030D', '\u030E', '\u030F',
    '\u0310', '\u0311', '\u0312', '\u0313', '\u0314', '\u0315', '\u0316', '\u0317',
    '\u0318', '\u0319', '\u031A', '\u031B', '\u031C', '\u031D', '\u031E', '\u031F',
    // ... many more combining diacritics
]);

/**
 * Control characters (zero width)
 */
const CONTROL_CHARS = new Set([
    '\u0000', '\u0001', '\u0002', '\u0003', '\u0004', '\u0005', '\u0006', '\u0007',
    '\u0008', '\u0009', '\u000A', '\u000B', '\u000C', '\u000D', '\u000E', '\u000F',
    '\u0010', '\u0011', '\u0012', '\u0013', '\u0014', '\u0015', '\u0016', '\u0017',
    '\u0018', '\u0019', '\u001A', '\u001B', '\u001C', '\u001D', '\u001E', '\u001F',
    '\u007F', '\u0080', '\u0081', '\u0082', '\u0083', '\u0084', '\u0085', '\u0086',
    '\u0087', '\u0088', '\u0089', '\u008A', '\u008B', '\u008C', '\u008D', '\u008E',
    '\u008F', '\u0090', '\u0091', '\u0092', '\u0093', '\u0094', '\u0095', '\u0096',
    '\u0097', '\u0098', '\u0099', '\u009A', '\u009B', '\u009C', '\u009D', '\u009E',
    '\u009F',
]);

/**
 * RTL scripts and characters
 */
const RTL_SCRIPTS = new Set([
    'Arabic', 'Hebrew', 'Persian', 'Urdu', 'Yiddish', 'Sindhi', 'Kurdish',
    'Pashto', 'Divehi', 'Thaana', 'Syriac'
]);

/**
 * Character bidi properties
 */
enum BidiProperty {
    L = 'L',      // Left-to-Right
    R = 'R',      // Right-to-Left
    AL = 'AL',    // Arabic Letter
    EN = 'EN',    // European Number
    ES = 'ES',    // European Separator
    ET = 'ET',    // European Terminator
    AN = 'AN',    // Arabic Number
    CS = 'CS',    // Common Separator
    NSM = 'NSM',  // Non-spacing Mark
    BN = 'BN',    // Boundary Neutral
    B = 'B',      // Paragraph Separator
    S = 'S',      // Segment Separator
    WS = 'WS',    // Whitespace
    ON = 'ON',    // Other Neutral
    LRE = 'LRE',  // Left-to-Right Embedding
    LRO = 'LRO',  // Left-to-Right Override
    RLE = 'RLE',  // Right-to-Left Embedding
    RLO = 'RLO',  // Right-to-Left Override
    PDF = 'PDF',  // Pop Directional Format
    LRI = 'LRI',  // Left-to-Right Isolate
    RLI = 'RLI',  // Right-to-Left Isolate
    FSI = 'FSI',  // First Strong Isolate
    PDI = 'PDI',  // Pop Directional Isolate
}

/**
 * Text segment information
 */
export interface TextSegment {
    text: string;
    width: number;
    direction: 'ltr' | 'rtl' | 'neutral';
    start: number;
    end: number;
}

/**
 * Layout options
 */
export interface LayoutOptions {
    maxWidth: number;
    align: 'left' | 'right' | 'center' | 'justify';
    direction?: 'ltr' | 'rtl' | 'auto';
    wrap: boolean;
    ellipsis?: boolean;
    preserveWhitespace: boolean;
    tabWidth: number;
}

/**
 * Unicode and text utilities
 */
export class TextUtils {
    /**
     * Get the display width of a Unicode string
     */
    static getStringWidth(str: string): number {
        let width = 0;
        let i = 0;

        while (i < str.length) {
            const char = str[i];
            const code = str.codePointAt(i) || 0;

            // Handle surrogate pairs for emoji and other high-plane characters
            if (code > 0xFFFF) {
                i += 2; // Skip surrogate pair
            } else {
                i += 1;
            }

            // Check if it's a control character
            if (CONTROL_CHARS.has(char)) {
                continue;
            }

            // Check if it's a combining character
            if (COMBINING_CHARS.has(char)) {
                continue;
            }

            // Check for explicit width mapping
            if (UNICODE_WIDTHS.has(char)) {
                width += UNICODE_WIDTHS.get(char)!;
                continue;
            }

            // Default width calculation
            // CJK Unified Ideographs and other wide characters
            if (this.isWideCharacter(code)) {
                width += 2;
            } else if (this.isNarrowCharacter(code)) {
                width += 1;
            } else {
                width += 1;
            }
        }

        return width;
    }

    /**
     * Check if a character is typically displayed as double-width
     */
    private static isWideCharacter(code: number): boolean {
        // CJK Unified Ideographs
        if (code >= 0x4E00 && code <= 0x9FFF) return true;
        // CJK Extension A
        if (code >= 0x3400 && code <= 0x4DBF) return true;
        // CJK Extension B
        if (code >= 0x20000 && code <= 0x2A6DF) return true;
        // Hangul Syllables
        if (code >= 0xAC00 && code <= 0xD7AF) return true;
        // Hiragana
        if (code >= 0x3040 && code <= 0x309F) return true;
        // Katakana
        if (code >= 0x30A0 && code <= 0x30FF) return true;
        // Fullwidth ASCII variants
        if (code >= 0xFF01 && code <= 0xFF5E) return true;
        // Halfwidth Katakana variants
        if (code >= 0xFF61 && code <= 0xFF9F) return false; // These are actually half-width

        return false;
    }

    /**
     * Check if a character is typically displayed as single-width
     */
    private static isNarrowCharacter(code: number): boolean {
        // Basic Latin
        if (code >= 0x0020 && code <= 0x007E) return true;
        // Latin-1 Supplement
        if (code >= 0x00A0 && code <= 0x00FF) return true;
        // Latin Extended-A
        if (code >= 0x0100 && code <= 0x017F) return true;
        // Latin Extended-B
        if (code >= 0x0180 && code <= 0x024F) return true;
        // Cyrillic
        if (code >= 0x0400 && code <= 0x04FF) return true;
        // Greek
        if (code >= 0x0370 && code <= 0x03FF) return true;
        // Hebrew
        if (code >= 0x0590 && code <= 0x05FF) return true;
        // Arabic
        if (code >= 0x0600 && code <= 0x06FF) return true;

        return false;
    }

    /**
     * Detect text direction (RTL/LTR)
     */
    static detectTextDirection(text: string): 'ltr' | 'rtl' | 'neutral' {
        let rtlCount = 0;
        let ltrCount = 0;
        let strongChars = 0;

        for (let i = 0; i < text.length; i++) {
            const code = text.codePointAt(i) || 0;
            const bidi = this.getBidiProperty(code);

            switch (bidi) {
                case BidiProperty.R:
                case BidiProperty.AL:
                    rtlCount++;
                    strongChars++;
                    break;
                case BidiProperty.L:
                    ltrCount++;
                    strongChars++;
                    break;
                case BidiProperty.RLE:
                case BidiProperty.RLO:
                    rtlCount += 10; // Strong RTL overrides
                    strongChars += 10;
                    break;
                case BidiProperty.LRE:
                case BidiProperty.LRO:
                    ltrCount += 10; // Strong LTR overrides
                    strongChars += 10;
                    break;
            }

            // Skip surrogate pairs
            if (code > 0xFFFF) i++;
        }

        if (strongChars === 0) return 'neutral';
        return rtlCount > ltrCount ? 'rtl' : 'ltr';
    }

    /**
     * Get Unicode bidi property for a character
     */
    private static getBidiProperty(code: number): BidiProperty {
        // Arabic letters
        if (code >= 0x0600 && code <= 0x06FF) {
            if (code >= 0x0621 && code <= 0x063A ||
                code >= 0x0641 && code <= 0x064A) {
                return BidiProperty.AL;
            }
        }

        // Hebrew letters
        if (code >= 0x0590 && code <= 0x05FF) {
            if (code >= 0x05D0 && code <= 0x05F2) {
                return BidiProperty.R;
            }
        }

        // Latin letters
        if ((code >= 0x0041 && code <= 0x005A) ||
            (code >= 0x0061 && code <= 0x007A)) {
            return BidiProperty.L;
        }

        // RTL/LTE embedding codes
        if (code === 0x202A) return BidiProperty.LRE;
        if (code === 0x202B) return BidiProperty.RLE;
        if (code === 0x202D) return BidiProperty.LRO;
        if (code === 0x202E) return BidiProperty.RLO;
        if (code === 0x202C) return BidiProperty.PDF;

        return BidiProperty.ON;
    }

    /**
     * Segment text for mixed-direction content
     */
    static segmentText(text: string): TextSegment[] {
        const segments: TextSegment[] = [];
        let currentDirection: 'ltr' | 'rtl' | 'neutral' = 'neutral';
        let currentStart = 0;
        let currentText = '';

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const code = text.codePointAt(i) || 0;
            const charDirection = this.getCharacterDirection(code);

            if (currentDirection === 'neutral') {
                currentDirection = charDirection;
            }

            // Check if direction changed
            if (charDirection !== 'neutral' && charDirection !== currentDirection) {
                if (currentText) {
                    segments.push({
                        text: currentText,
                        width: this.getStringWidth(currentText),
                        direction: currentDirection,
                        start: currentStart,
                        end: currentStart + currentText.length
                    });
                }
                currentDirection = charDirection;
                currentStart = i;
                currentText = '';
            }

            currentText += char;

            // Skip surrogate pairs
            if (code > 0xFFFF) i++;
        }

        // Add last segment
        if (currentText) {
            segments.push({
                text: currentText,
                width: this.getStringWidth(currentText),
                direction: currentDirection,
                start: currentStart,
                end: currentStart + currentText.length
            });
        }

        return segments;
    }

    /**
     * Get character direction
     */
    private static getCharacterDirection(code: number): 'ltr' | 'rtl' | 'neutral' {
        const bidi = this.getBidiProperty(code);
        switch (bidi) {
            case BidiProperty.R:
            case BidiProperty.AL:
            case BidiProperty.RLE:
            case BidiProperty.RLO:
                return 'rtl';
            case BidiProperty.L:
            case BidiProperty.LRE:
            case BidiProperty.LRO:
                return 'ltr';
            default:
                return 'neutral';
        }
    }

    /**
     * Truncate text to fit within specified width
     */
    static truncateText(text: string, maxWidth: number, ellipsis: string = '…'): string {
        if (this.getStringWidth(text) <= maxWidth) {
            return text;
        }

        const ellipsisWidth = this.getStringWidth(ellipsis);
        if (ellipsisWidth >= maxWidth) {
            return '';
        }

        let result = '';
        let width = 0;
        let i = 0;

        while (i < text.length && width < maxWidth - ellipsisWidth) {
            const char = text[i];
            const charWidth = this.getCharWidth(char);

            if (width + charWidth <= maxWidth - ellipsisWidth) {
                result += char;
                width += charWidth;
            } else {
                break;
            }

            i++;

            // Handle surrogate pairs
            const code = text.codePointAt(i - 1) || 0;
            if (code > 0xFFFF) {
                result += text[i];
                i++;
            }
        }

        return result + ellipsis;
    }

    /**
     * Get width of a single character
     */
    static getCharWidth(char: string): number {
        if (char.length === 0) return 0;

        const code = char.codePointAt(0) || 0;

        // Control and combining characters
        if (CONTROL_CHARS.has(char) || COMBINING_CHARS.has(char)) {
            return 0;
        }

        // Explicit width mapping
        if (UNICODE_WIDTHS.has(char)) {
            return UNICODE_WIDTHS.get(char)!;
        }

        // Default calculation
        if (this.isWideCharacter(code)) return 2;
        return 1;
    }

    /**
     * Pad text to specified width considering Unicode
     */
    static padText(text: string, width: number, align: 'left' | 'right' | 'center' = 'left', fill: string = ' '): string {
        const textWidth = this.getStringWidth(text);

        if (textWidth >= width) {
            return text;
        }

        const padWidth = width - textWidth;
        const fillWidth = this.getStringWidth(fill) || 1;

        switch (align) {
            case 'left': {
                const padCount = Math.ceil(padWidth / fillWidth);
                return text + fill.repeat(padCount);
            }
            case 'right': {
                const padCount = Math.ceil(padWidth / fillWidth);
                return fill.repeat(padCount) + text;
            }
            case 'center': {
                const leftPad = Math.floor(padWidth / 2 / fillWidth);
                const rightPad = Math.ceil(padWidth / 2 / fillWidth);
                return fill.repeat(leftPad) + text + fill.repeat(rightPad);
            }
        }
    }

    /**
     * Wrap text to specified width with Unicode awareness
     */
    static wrapText(text: string, maxWidth: number, options: Partial<LayoutOptions> = {}): string[] {
        const opts: LayoutOptions = {
            maxWidth,
            align: 'left',
            direction: 'auto',
            wrap: true,
            preserveWhitespace: true,
            tabWidth: 4,
            ...options
        };

        if (!opts.wrap || maxWidth <= 0) {
            return [text];
        }

        const lines: string[] = [];
        let currentLine = '';
        let currentWidth = 0;

        const words = text.split(/(\s+)/);

        for (const word of words) {
            // Handle whitespace
            if (/^\s+$/.test(word)) {
                if (opts.preserveWhitespace) {
                    if (currentWidth + this.getStringWidth(word) <= maxWidth) {
                        currentLine += word;
                        currentWidth += this.getStringWidth(word);
                    } else {
                        lines.push(currentLine);
                        currentLine = '';
                        currentWidth = 0;
                    }
                }
                continue;
            }

            const wordWidth = this.getStringWidth(word);

            if (wordWidth > maxWidth) {
                // Word is longer than line, break it
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = '';
                    currentWidth = 0;
                }

                let remainingWord = word;
                while (remainingWord) {
                    const segment = this.truncateText(remainingWord, maxWidth, '');
                    lines.push(segment);
                    remainingWord = remainingWord.substring(segment.length);
                }
            } else if (currentWidth + wordWidth <= maxWidth) {
                currentLine += word;
                currentWidth += wordWidth;
            } else {
                lines.push(currentLine);
                currentLine = word;
                currentWidth = wordWidth;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    /**
     * Apply bidirectional layout to text
     */
    static applyBidiLayout(text: string, baseDirection: 'ltr' | 'rtl' | 'auto' = 'auto'): string {
        if (baseDirection === 'auto') {
            baseDirection = this.detectTextDirection(text);
        }

        const segments = this.segmentText(text);
        if (segments.length <= 1) {
            return text;
        }

        // For RTL base direction, reverse segments
        if (baseDirection === 'rtl') {
            segments.reverse();
        }

        return segments.map(s => s.text).join('');
    }

    /**
     * Convert text to visual order for rendering
     */
    static toVisualOrder(text: string, baseDirection: 'ltr' | 'rtl' | 'auto' = 'auto'): string {
        // Simplified visual order calculation
        // Real implementation would use Unicode Bidi Algorithm
        return this.applyBidiLayout(text, baseDirection);
    }
}