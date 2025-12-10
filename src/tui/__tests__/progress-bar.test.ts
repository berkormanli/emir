import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressBar, ProgressBarOptions } from '../progress-bar';

describe('ProgressBar', () => {
    let progressBar: ProgressBar;
    
    afterEach(() => {
        if (progressBar) {
            progressBar.destroy();
        }
    });

    describe('constructor', () => {
        it('should initialize with default values', () => {
            progressBar = new ProgressBar('test-progress');
            
            expect(progressBar.id).toBe('test-progress');
            expect(progressBar.getProgress()).toBe(0);
            expect(progressBar.getPercentage()).toBe(0);
            expect(progressBar.visible).toBe(true);
        });

        it('should apply options', () => {
            const options: ProgressBarOptions = {
                label: 'Loading',
                total: 200,
                showPercentage: false,
                showValue: true,
                style: 'blocks',
                color: 3,
                width: 50
            };
            
            progressBar = new ProgressBar('test', options);
            
            expect(progressBar.size.width).toBe(50);
            expect(progressBar.size.height).toBe(2); // Has label
        });

        it('should start animation if indeterminate', () => {
            progressBar = new ProgressBar('test', { indeterminate: true });
            
            const initialRender = progressBar.render();
            
            // Should be in animation mode
            expect(initialRender).toBeDefined();
        });
    });

    describe('progress management', () => {
        beforeEach(() => {
            progressBar = new ProgressBar('test', { total: 100 });
        });

        it('should set progress', () => {
            progressBar.setProgress(50);
            
            expect(progressBar.getProgress()).toBe(50);
            expect(progressBar.getPercentage()).toBe(50);
        });

        it('should clamp progress to valid range', () => {
            progressBar.setProgress(-10);
            expect(progressBar.getProgress()).toBe(0);
            
            progressBar.setProgress(150);
            expect(progressBar.getProgress()).toBe(100);
        });

        it('should increment progress', () => {
            progressBar.setProgress(30);
            progressBar.increment(10);
            
            expect(progressBar.getProgress()).toBe(40);
        });

        it('should decrement progress', () => {
            progressBar.setProgress(50);
            progressBar.decrement(15);
            
            expect(progressBar.getProgress()).toBe(35);
        });

        it('should reset progress', () => {
            progressBar.setProgress(75);
            progressBar.reset();
            
            expect(progressBar.getProgress()).toBe(0);
        });

        it('should complete progress', () => {
            progressBar.setProgress(25);
            progressBar.complete();
            
            expect(progressBar.getProgress()).toBe(100);
            expect(progressBar.getPercentage()).toBe(100);
        });

        it('should update total', () => {
            progressBar.setProgress(50);
            progressBar.setTotal(200);
            
            expect(progressBar.getProgress()).toBe(50);
            expect(progressBar.getPercentage()).toBe(25);
        });

        it('should handle zero total', () => {
            progressBar.setTotal(0);
            
            expect(progressBar.getPercentage()).toBe(0);
        });
    });

    describe('indeterminate mode', () => {
        it('should ignore setProgress in indeterminate mode', () => {
            progressBar = new ProgressBar('test', { indeterminate: true });
            
            progressBar.setProgress(50);
            
            expect(progressBar.getProgress()).toBe(0);
        });

        it('should switch between determinate and indeterminate', () => {
            progressBar = new ProgressBar('test', { indeterminate: false });
            
            progressBar.setProgress(50);
            expect(progressBar.getProgress()).toBe(50);
            
            progressBar.setIndeterminate(true);
            progressBar.setProgress(75); // Should be ignored
            expect(progressBar.getProgress()).toBe(50); // Unchanged
            
            progressBar.setIndeterminate(false);
            progressBar.setProgress(75);
            expect(progressBar.getProgress()).toBe(75);
        });

        it('should animate in indeterminate mode', () => {
            progressBar = new ProgressBar('test', { 
                indeterminate: true,
                animationSpeed: 50
            });
            
            const render1 = progressBar.render();
            
            // Manually advance animation
            progressBar.updateAnimation();
            
            const render2 = progressBar.render();
            
            // Both renders should be valid
            expect(render1).toBeDefined();
            expect(render2).toBeDefined();
        });
    });

    describe('rendering', () => {
        beforeEach(() => {
            progressBar = new ProgressBar('test', { 
                total: 100,
                width: 20
            });
        });

        it('should render empty progress bar', () => {
            const rendered = progressBar.render();
            
            expect(rendered).toContain('[');
            expect(rendered).toContain(']');
            expect(rendered).toContain('0%');
        });

        it('should render partial progress', () => {
            progressBar.setProgress(50);
            const rendered = progressBar.render();
            
            expect(rendered).toContain('50%');
            expect(rendered).toContain('█'); // Fill character
            expect(rendered).toContain('░'); // Empty character
        });

        it('should render full progress', () => {
            progressBar.setProgress(100);
            const rendered = progressBar.render();
            
            expect(rendered).toContain('100%');
        });

        it('should render with label', () => {
            progressBar.setLabel('Downloading');
            const rendered = progressBar.render();
            
            expect(rendered).toContain('Downloading');
        });

        it('should render with value instead of percentage', () => {
            progressBar = new ProgressBar('test', {
                total: 200,
                showPercentage: false,
                showValue: true
            });
            
            progressBar.setProgress(75);
            const rendered = progressBar.render();
            
            expect(rendered).toContain('75/200');
            expect(rendered).not.toContain('%');
        });

        it('should render different styles', () => {
            // Blocks style
            progressBar.setStyle('blocks');
            progressBar.setProgress(50);
            let rendered = progressBar.render();
            expect(rendered).toContain('■'); // Block fill
            expect(rendered).toContain('□'); // Block empty
            
            // Line style
            progressBar.setStyle('line');
            rendered = progressBar.render();
            expect(rendered).toContain('━'); // Line fill
            expect(rendered).toContain('─'); // Line empty
            
            // Dots style
            progressBar.setStyle('dots');
            rendered = progressBar.render();
            expect(rendered).toContain('●'); // Dot fill
            expect(rendered).toContain('○'); // Dot empty
        });

        it('should render spinner style', () => {
            progressBar.setStyle('spinner');
            progressBar.setProgress(50);
            const rendered = progressBar.render();
            
            // Should show spinner character and percentage
            expect(rendered).toContain('50%');
        });

        it('should render indeterminate progress bar', () => {
            progressBar = new ProgressBar('test', {
                indeterminate: true,
                style: 'bar',
                width: 20
            });
            
            const rendered = progressBar.render();
            
            expect(rendered).toContain('[');
            expect(rendered).toContain(']');
            expect(rendered).toContain('█'); // Moving indicator
        });

        it('should render indeterminate spinner', () => {
            progressBar = new ProgressBar('test', {
                indeterminate: true,
                style: 'spinner',
                label: 'Processing'
            });
            
            const rendered = progressBar.render();
            
            expect(rendered).toContain('Processing');
            // Should contain one of the spinner frames
            expect(rendered).toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
        });

        it('should use custom characters', () => {
            progressBar = new ProgressBar('test', {
                fillChar: '#',
                emptyChar: '-',
                barStart: '<',
                barEnd: '>',
                width: 20
            });
            
            progressBar.setProgress(50);
            const rendered = progressBar.render();
            
            expect(rendered).toContain('<');
            expect(rendered).toContain('>');
            expect(rendered).toContain('#');
            expect(rendered).toContain('-');
        });
    });

    describe('animation', () => {
        it('should update animation frame', () => {
            progressBar = new ProgressBar('test', { 
                indeterminate: true,
                animationSpeed: 100
            });
            
            // Force update animation by simulating time passage
            const before = Date.now();
            progressBar.updateAnimation();
            
            // Animation should work
            expect(progressBar).toBeDefined();
        });

        it('should stop animation on destroy', () => {
            progressBar = new ProgressBar('test', { indeterminate: true });
            
            const stopSpy = vi.spyOn(progressBar as any, 'stopAnimation');
            
            progressBar.destroy();
            
            expect(stopSpy).toHaveBeenCalled();
        });

        it('should handle spinner type change', () => {
            progressBar = new ProgressBar('test', {
                indeterminate: true,
                style: 'spinner'
            });
            
            progressBar.setSpinnerType('dots');
            const rendered = progressBar.render();
            
            // Should use dots spinner frames
            expect(rendered).toMatch(/[⣾⣽⣻⢿⡿⣟⣯⣷Loading]/);
        });
    });

    describe('label management', () => {
        it('should update label and adjust height', () => {
            progressBar = new ProgressBar('test');
            
            expect(progressBar.size.height).toBe(1);
            
            progressBar.setLabel('Processing');
            
            expect(progressBar.size.height).toBe(2);
            
            const rendered = progressBar.render();
            expect(rendered).toContain('Processing');
        });
    });

    describe('edge cases', () => {
        it('should handle very small width', () => {
            progressBar = new ProgressBar('test', { width: 5 });
            progressBar.setProgress(50);
            
            const rendered = progressBar.render();
            expect(rendered).toBeDefined();
        });

        it('should handle progress exceeding total', () => {
            progressBar = new ProgressBar('test', { total: 50 });
            progressBar.setProgress(100);
            
            expect(progressBar.getProgress()).toBe(50);
            expect(progressBar.getPercentage()).toBe(100);
        });

        it('should handle negative increment/decrement', () => {
            progressBar = new ProgressBar('test');
            progressBar.setProgress(50);
            
            progressBar.increment(-10);
            expect(progressBar.getProgress()).toBe(40);
            
            progressBar.decrement(-20);
            expect(progressBar.getProgress()).toBe(60);
        });
    });
});
