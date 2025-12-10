import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export interface DatePickerConfig {
    format?: 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'DD-MM-YYYY';
    showWeekNumbers?: boolean;
    startOfWeek?: 'sunday' | 'monday';
    minDate?: Date;
    maxDate?: Date;
    disabledDates?: Date[];
    highlightToday?: boolean;
    highlightWeekends?: boolean;
    allowKeyboardNavigation?: boolean;
}

export class DatePicker extends BaseComponent {
    private selectedDate: Date | null = null;
    private viewDate: Date;
    private config: Required<DatePickerConfig>;
    private theme: ThemeManager;
    private mode: 'input' | 'calendar' = 'input';
    private inputText = '';
    private cursorPosition = 0;
    private isCalendarOpen = false;

    constructor(
        id: string,
        position: Position,
        size: Size,
        config: DatePickerConfig = {}
    ) {
        super(id, position, size);
        this.config = {
            format: config.format ?? 'YYYY-MM-DD',
            showWeekNumbers: config.showWeekNumbers ?? false,
            startOfWeek: config.startOfWeek ?? 'sunday',
            minDate: config.minDate,
            maxDate: config.maxDate,
            disabledDates: config.disabledDates ?? [],
            highlightToday: config.highlightToday ?? true,
            highlightWeekends: config.highlightWeekends ?? true,
            allowKeyboardNavigation: config.allowKeyboardNavigation ?? true
        };
        this.theme = ThemeManager.getInstance();
        this.viewDate = new Date();
    }

    setSelectedDate(date: Date | null): void {
        this.selectedDate = date;
        this.inputText = date ? this.formatDate(date) : '';
        this.markDirty();
    }

    getSelectedDate(): Date | null {
        return this.selectedDate;
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        switch (this.config.format) {
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            case 'DD-MM-YYYY':
                return `${day}-${month}-${year}`;
            default:
                return `${year}-${month}-${day}`;
        }
    }

    private parseDate(text: string): Date | null {
        let year: number, month: number, day: number;

        switch (this.config.format) {
            case 'YYYY-MM-DD':
                const match1 = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (match1) {
                    year = parseInt(match1[1]);
                    month = parseInt(match1[2]) - 1;
                    day = parseInt(match1[3]);
                    break;
                }
                return null;

            case 'MM/DD/YYYY':
                const match2 = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (match2) {
                    month = parseInt(match2[1]) - 1;
                    day = parseInt(match2[2]);
                    year = parseInt(match2[3]);
                    break;
                }
                return null;

            case 'DD/MM/YYYY':
                const match3 = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (match3) {
                    day = parseInt(match3[1]);
                    month = parseInt(match3[2]) - 1;
                    year = parseInt(match3[3]);
                    break;
                }
                return null;

            case 'DD-MM-YYYY':
                const match4 = text.match(/^(\d{2})-(\d{2})-(\d{4})$/);
                if (match4) {
                    day = parseInt(match4[1]);
                    month = parseInt(match4[2]) - 1;
                    year = parseInt(match4[3]);
                    break;
                }
                return null;

            default:
                return null;
        }

        const date = new Date(year, month, day);
        if (date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day) {
            return date;
        }

        return null;
    }

    handleInput(input: InputEvent): boolean {
        if (this.mode === 'input') {
            return this.handleInputMode(input);
        } else {
            return this.handleCalendarMode(input);
        }
    }

    private handleInputMode(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'enter':
                case 'Return':
                case 'down':
                case 'ArrowDown':
                    this.openCalendar();
                    return true;

                case 'backspace':
                case 'Delete':
                    if (this.cursorPosition > 0) {
                        this.inputText = this.inputText.slice(0, this.cursorPosition - 1) +
                                       this.inputText.slice(this.cursorPosition);
                        this.cursorPosition--;
                        this.selectedDate = this.parseDate(this.inputText);
                        this.markDirty();
                    }
                    return true;

                case 'left':
                case 'ArrowLeft':
                    this.cursorPosition = Math.max(0, this.cursorPosition - 1);
                    this.markDirty();
                    return true;

                case 'right':
                case 'ArrowRight':
                    this.cursorPosition = Math.min(this.inputText.length, this.cursorPosition + 1);
                    this.markDirty();
                    return true;

                case 'escape':
                    this.blur();
                    return true;

                default:
                    if (input.key && input.key.length === 1) {
                        const newChar = input.key;
                        const newText = this.inputText.slice(0, this.cursorPosition) +
                                      newChar + this.inputText.slice(this.cursorPosition);

                        const tempDate = this.parseDate(newText);
                        if (tempDate || this.isValidPartialDate(newText)) {
                            this.inputText = newText;
                            this.cursorPosition++;
                            this.selectedDate = tempDate;
                            this.markDirty();
                        }
                        return true;
                    }
            }
        }

        return false;
    }

    private handleCalendarMode(input: InputEvent): boolean {
        if (input.type === 'key') {
            switch (input.key) {
                case 'up':
                case 'ArrowUp':
                    this.navigateCalendar(-7);
                    return true;

                case 'down':
                case 'ArrowDown':
                    this.navigateCalendar(7);
                    return true;

                case 'left':
                case 'ArrowLeft':
                    this.navigateCalendar(-1);
                    return true;

                case 'right':
                case 'ArrowRight':
                    this.navigateCalendar(1);
                    return true;

                case 'enter':
                case 'Return':
                case ' ':
                    this.selectCurrentDay();
                    return true;

                case 'escape':
                    this.closeCalendar();
                    return true;

                case 'pageup':
                case 'PageUp':
                    if (input.shift) {
                        this.viewDate.setFullYear(this.viewDate.getFullYear() - 1);
                    } else {
                        this.viewDate.setMonth(this.viewDate.getMonth() - 1);
                    }
                    this.markDirty();
                    return true;

                case 'pagedown':
                case 'PageDown':
                    if (input.shift) {
                        this.viewDate.setFullYear(this.viewDate.getFullYear() + 1);
                    } else {
                        this.viewDate.setMonth(this.viewDate.getMonth() + 1);
                    }
                    this.markDirty();
                    return true;

                case 'home':
                    this.goToToday();
                    return true;
            }
        }

        return false;
    }

    private openCalendar(): void {
        if (this.selectedDate) {
            this.viewDate = new Date(this.selectedDate);
        }
        this.mode = 'calendar';
        this.isCalendarOpen = true;
        this.markDirty();
    }

    private closeCalendar(): void {
        this.mode = 'input';
        this.isCalendarOpen = false;
        this.markDirty();
    }

    private navigateCalendar(days: number): void {
        const currentDay = this.viewDate.getDate();
        this.viewDate.setDate(currentDay + days);
        this.markDirty();
    }

    private selectCurrentDay(): void {
        this.selectedDate = new Date(this.viewDate);
        this.inputText = this.formatDate(this.selectedDate);
        this.closeCalendar();
    }

    private goToToday(): void {
        this.viewDate = new Date();
        this.markDirty();
    }

    private isValidPartialDate(text: string): boolean {
        const patterns: Record<string, RegExp> = {
            'YYYY-MM-DD': /^\d{0,4}-?\d{0,2}-?\d{0,2}$/,
            'MM/DD/YYYY': /^\d{0,2}\/?\d{0,2}\/?\d{0,4}$/,
            'DD/MM/YYYY': /^\d{0,2}\/?\d{0,2}\/?\d{0,4}$/,
            'DD-MM-YYYY': /^\d{0,2}-?\d{0,2}-?\d{0,4}$/
        };

        return patterns[this.config.format].test(text);
    }

    private isDateDisabled(date: Date): boolean {
        if (this.config.minDate && date < this.config.minDate) return true;
        if (this.config.maxDate && date > this.config.maxDate) return true;

        for (const disabled of this.config.disabledDates) {
            if (this.isSameDay(date, disabled)) return true;
        }

        return false;
    }

    private isSameDay(date1: Date, date2: Date): boolean {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }

    private isWeekend(date: Date): boolean {
        const day = date.getDay();
        return day === 0 || day === 6;
    }

    render(): string {
        if (this.mode === 'input') {
            return this.renderInput();
        } else {
            return this.renderCalendar();
        }
    }

    private renderInput(): string {
        const theme = this.theme.getCurrentTheme();
        const width = this.size.width;

        let displayText = this.inputText;
        if (this.state.focused) {
            const cursor = this.theme.applyColor('█', 'primary');
            displayText = displayText.slice(0, this.cursorPosition) +
                         cursor +
                         displayText.slice(this.cursorPosition);
        }

        const placeholder = this.config.format;
        if (!displayText) {
            displayText = this.theme.applyColor(placeholder, 'muted');
        }

        const paddedText = displayText.padEnd(width, ' ');

        if (this.state.focused) {
            return this.theme.applyColor(paddedText, 'textPrimary');
        } else {
            return this.theme.applyColor(paddedText, 'textSecondary');
        }
    }

    private renderCalendar(): string {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        lines.push(this.renderCalendarHeader());
        lines.push(this.renderCalendarWeekdays());
        lines.push(...this.renderCalendarDays());

        return lines.slice(0, this.size.height).join('\n');
    }

    private renderCalendarHeader(): string {
        const theme = this.theme.getCurrentTheme();
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const monthYear = `${months[this.viewDate.getMonth()]} ${this.viewDate.getFullYear()}`;
        const centered = monthYear.padStart(20, ' ').padEnd(40, ' ');

        return this.theme.applyTypography(centered, 'heading');
    }

    private renderCalendarWeekdays(): string {
        const theme = this.theme.getCurrentTheme();
        const weekdays = this.config.startOfWeek === 'sunday'
            ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
            : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

        let line = '';
        if (this.config.showWeekNumbers) {
            line += '   ';
        }

        for (const day of weekdays) {
            line += ' ' + this.theme.applyColor(day.padEnd(2), 'textSecondary') + ' ';
        }

        return line;
    }

    private renderCalendarDays(): string[] {
        const theme = this.theme.getCurrentTheme();
        const lines: string[] = [];

        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startOffset = this.config.startOfWeek === 'sunday'
            ? firstDay.getDay()
            : (firstDay.getDay() + 6) % 7;

        const daysInMonth = lastDay.getDate();
        let currentDay = 1;
        let weekLine = '';

        for (let week = 0; week < 6; week++) {
            weekLine = '';

            if (this.config.showWeekNumbers) {
                const weekNum = this.getWeekNumber(new Date(year, month, currentDay));
                weekLine += this.theme.applyColor(String(weekNum).padStart(3), 'muted') + ' ';
            }

            for (let day = 0; day < 7; day++) {
                if (week === 0 && day < startOffset) {
                    weekLine += '   ';
                } else if (currentDay > daysInMonth) {
                    weekLine += '   ';
                } else {
                    const currentDate = new Date(year, month, currentDay);
                    const isToday = this.isSameDay(currentDate, new Date());
                    const isSelected = this.selectedDate && this.isSameDay(currentDate, this.selectedDate);
                    const isDisabled = this.isDateDisabled(currentDate);
                    const isWeekend = this.isWeekend(currentDate);

                    let dayStr = String(currentDay).padStart(2);

                    if (isSelected) {
                        dayStr = this.theme.applyColor(dayStr, 'primary');
                        dayStr = this.theme.applyTypography(dayStr, 'button');
                    } else if (isToday && this.config.highlightToday) {
                        dayStr = this.theme.applyColor(dayStr, 'info');
                    } else if (isWeekend && this.config.highlightWeekends) {
                        dayStr = this.theme.applyColor(dayStr, 'warning');
                    } else if (isDisabled) {
                        dayStr = this.theme.applyColor(dayStr, 'textDisabled');
                    } else if (this.isSameDay(currentDate, this.viewDate)) {
                        dayStr = this.theme.applyColor(dayStr, 'focus');
                    } else {
                        dayStr = this.theme.applyColor(dayStr, 'textPrimary');
                    }

                    weekLine += ' ' + dayStr + ' ';
                    currentDay++;
                }
            }

            lines.push(weekLine);

            if (currentDay > daysInMonth) {
                break;
            }
        }

        return lines;
    }

    private getWeekNumber(date: Date): number {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
}