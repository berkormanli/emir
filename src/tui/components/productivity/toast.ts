import { BaseComponent } from '../../base-component';
import { InputEvent, Position, Size } from '../../types';
import { ThemeManager } from '../../theme';

export enum ToastType {
    SUCCESS = 'success',
    ERROR = 'error',
    WARNING = 'warning',
    INFO = 'info',
    LOADING = 'loading'
}

export interface ToastMessage {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
    persistent?: boolean;
    action?: {
        label: string;
        handler: () => void;
    };
    progress?: number;
    icon?: string;
}

export interface ToastConfig {
    maxToasts?: number;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
    defaultDuration?: number;
    showIcons?: boolean;
    showProgress?: boolean;
    allowDismiss?: boolean;
    stackDirection?: 'vertical' | 'horizontal';
    animationDuration?: number;
}

export class ToastManager {
    private static instance: ToastManager;
    private toasts: ToastMessage[] = [];
    private config: Required<ToastConfig>;
    private toastComponents: Map<string, Toast> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();

    private constructor(config: ToastConfig = {}) {
        this.config = {
            maxToasts: config.maxToasts ?? 5,
            position: config.position ?? 'top-right',
            defaultDuration: config.defaultDuration ?? 5000,
            showIcons: config.showIcons ?? true,
            showProgress: config.showProgress ?? true,
            allowDismiss: config.allowDismiss ?? true,
            stackDirection: config.stackDirection ?? 'vertical',
            animationDuration: config.animationDuration ?? 300
        };
    }

    static getInstance(): ToastManager {
        if (!ToastManager.instance) {
            ToastManager.instance = new ToastManager();
        }
        return ToastManager.instance;
    }

    show(message: Partial<ToastMessage>): string {
        const toast: ToastMessage = {
            id: message.id ?? `toast-${Date.now()}-${Math.random()}`,
            type: message.type ?? ToastType.INFO,
            title: message.title,
            message: message.message ?? '',
            duration: message.duration ?? this.config.defaultDuration,
            persistent: message.persistent ?? false,
            action: message.action,
            progress: message.progress,
            icon: message.icon
        };

        if (this.toasts.length >= this.config.maxToasts) {
            const removedToast = this.toasts.shift();
            if (removedToast) {
                this.removeToast(removedToast.id);
            }
        }

        this.toasts.push(toast);

        if (!toast.persistent && toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                this.removeToast(toast.id);
            }, toast.duration);
            this.timers.set(toast.id, timer);
        }

        this.notifyComponents();
        return toast.id;
    }

    success(message: string, title?: string): string {
        return this.show({
            type: ToastType.SUCCESS,
            title,
            message
        });
    }

    error(message: string, title?: string): string {
        return this.show({
            type: ToastType.ERROR,
            title,
            message
        });
    }

    warning(message: string, title?: string): string {
        return this.show({
            type: ToastType.WARNING,
            title,
            message
        });
    }

    info(message: string, title?: string): string {
        return this.show({
            type: ToastType.INFO,
            title,
            message
        });
    }

    loading(message: string, title?: string, progress?: number): string {
        return this.show({
            type: ToastType.LOADING,
            title,
            message,
            persistent: true,
            progress
        });
    }

    removeToast(toastId: string): void {
        const index = this.toasts.findIndex(toast => toast.id === toastId);
        if (index !== -1) {
            this.toasts.splice(index, 1);
        }

        const timer = this.timers.get(toastId);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(toastId);
        }

        this.notifyComponents();
    }

    updateProgress(toastId: string, progress: number): void {
        const toast = this.toasts.find(t => t.id === toastId);
        if (toast) {
            toast.progress = Math.max(0, Math.min(100, progress));
            this.notifyComponents();
        }
    }

    clearAll(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
        this.toasts = [];
        this.notifyComponents();
    }

    getToasts(): readonly ToastMessage[] {
        return [...this.toasts];
    }

    registerComponent(component: Toast): void {
        this.toastComponents.set(component.id, component);
    }

    unregisterComponent(component: Toast): void {
        this.toastComponents.delete(component.id);
    }

    private notifyComponents(): void {
        for (const component of this.toastComponents.values()) {
            component.update();
        }
    }

    getConfig(): Required<ToastConfig> {
        return { ...this.config };
    }
}

export class Toast extends BaseComponent {
    private manager: ToastManager;
    private currentToasts: ToastMessage[] = [];
    private animationFrame: number | null = null;

    constructor(
        id: string,
        position: Position,
        size: Size
    ) {
        super(id, position, size);
        this.manager = ToastManager.getInstance();
        this.manager.registerComponent(this);
        this.update();
    }

    update(): void {
        this.currentToasts = this.manager.getToasts();
        this.markDirty();
    }

    handleInput(input: InputEvent): boolean {
        if (input.type === 'mouse' && input.mouse) {
            const x = input.mouse.x - this.position.x;
            const y = input.mouse.y - this.position.y;

            if (input.mouse.action === 'press') {
                const clickedToast = this.getToastAtPosition(x, y);
                if (clickedToast) {
                    this.handleToastClick(clickedToast, x, y);
                    return true;
                }
            }
        }

        return false;
    }

    private getToastAtPosition(x: number, y: number): ToastMessage | null {
        const config = this.manager.getConfig();
        let currentY = 0;

        for (const toast of this.currentToasts) {
            const toastHeight = this.calculateToastHeight(toast);
            if (y >= currentY && y < currentY + toastHeight) {
                return toast;
            }
            currentY += toastHeight + 1;
        }

        return null;
    }

    private handleToastClick(toast: ToastMessage, x: number, y: number): void {
        const config = this.manager.getConfig();
        const theme = ThemeManager.getInstance();

        if (config.allowDismiss) {
            const toastHeight = this.calculateToastHeight(toast);
            const dismissX = this.size.width - 3;

            if (x >= dismissX && x < dismissX + 2) {
                this.manager.removeToast(toast.id);
                return;
            }
        }

        if (toast.action) {
            const actionY = this.calculateToastHeight(toast) - 2;
            if (y >= actionY) {
                toast.action.handler();
                this.manager.removeToast(toast.id);
            }
        }
    }

    private calculateToastHeight(toast: ToastMessage): number {
        let height = 2;
        if (toast.title) height += 1;
        if (toast.action) height += 1;
        return height;
    }

    render(): string {
        const theme = this.theme.getCurrentTheme();
        const config = this.manager.getConfig();
        const lines: string[] = [];

        for (let i = 0; i < this.currentToasts.length; i++) {
            const toast = this.currentToasts[i];
            const toastLines = this.renderToast(toast, i === this.currentToasts.length - 1);
            lines.push(...toastLines);

            if (i < this.currentToasts.length - 1) {
                lines.push('');
            }
        }

        while (lines.length < this.size.height) {
            lines.push('');
        }

        return lines.join('\n');
    }

    private renderToast(toast: ToastMessage, isLast: boolean): string[] {
        const theme = this.theme.getCurrentTheme();
        const config = this.manager.getConfig();
        const lines: string[] = [];

        const bgColor = this.getToastColor(toast.type);
        const fgColor = this.getToastForegroundColor(toast.type);

        let borderChar = '─';
        let cornerChar = '┌┐└┘';
        const border = this.theme.applyBorderColor(borderChar);

        const topBorder = border[0] + border.repeat(this.size.width - 2) + border[1];
        lines.push(topBorder);

        let contentLine = border[3] + ' ';

        if (config.showIcons || toast.icon) {
            const icon = toast.icon || this.getDefaultIcon(toast.type);
            contentLine += icon + ' ';
        }

        if (toast.title) {
            const title = this.theme.applyTypography(toast.title, 'heading');
            contentLine += title;
            if (toast.message) {
                contentLine += ': ';
            }
        }

        if (toast.message) {
            const remainingWidth = this.size.width - contentLine.length - 3;
            const message = this.truncateText(toast.message, remainingWidth);
            contentLine += message;
        }

        contentLine += ' ' + border[3];
        lines.push(contentLine);

        if (config.showProgress && toast.progress !== undefined) {
            const progressWidth = this.size.width - 4;
            const filled = Math.round((toast.progress / 100) * progressWidth);
            const empty = progressWidth - filled;

            let progressLine = border[3] + ' ';
            progressLine += this.theme.applyColor('█'.repeat(filled), bgColor);
            progressLine += this.theme.applyColor('░'.repeat(empty), 'muted');
            progressLine += ' ' + border[3];

            lines.push(progressLine);
        }

        if (toast.action) {
            const actionText = `[${toast.action.label}]`;
            const actionLine = border[3] + ' '.repeat(this.size.width - actionText.length - 3) +
                            this.theme.applyColor(actionText, 'primary') + ' ' + border[3];
            lines.push(actionLine);
        }

        let bottomBorder = border[2] + border.repeat(this.size.width - 2);
        if (config.allowDismiss) {
            bottomBorder += this.theme.applyColor('×', 'textSecondary') + border[3];
        } else {
            bottomBorder += border[2];
        }
        lines.push(bottomBorder);

        return lines;
    }

    private getToastColor(type: ToastType): string {
        switch (type) {
            case ToastType.SUCCESS: return 'success';
            case ToastType.ERROR: return 'error';
            case ToastType.WARNING: return 'warning';
            case ToastType.INFO: return 'info';
            case ToastType.LOADING: return 'primary';
            default: return 'primary';
        }
    }

    private getToastForegroundColor(type: ToastType): string {
        switch (type) {
            case ToastType.ERROR:
            case ToastType.SUCCESS:
            case ToastType.WARNING:
                return 'background';
            default:
                return 'textPrimary';
        }
    }

    private getDefaultIcon(type: ToastType): string {
        switch (type) {
            case ToastType.SUCCESS: return '✓';
            case ToastType.ERROR: return '✗';
            case ToastType.WARNING: return '⚠';
            case ToastType.INFO: return 'ℹ';
            case ToastType.LOADING: return '⏳';
            default: return '•';
        }
    }

    private truncateText(text: string, maxLength: number): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    destroy(): void {
        this.manager.unregisterComponent(this);
        super.destroy();
    }
}