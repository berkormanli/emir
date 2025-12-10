import { EventEmitter } from 'events';
import { AnsiUtils } from './ansi-utils.js';

/**
 * Animation types
 */
export type AnimationType =
  | 'fade'
  | 'slide'
  | 'scale'
  | 'blink'
  | 'pulse'
  | 'rotation'
  | 'typewriter'
  | 'progress'
  | 'slideDown'
  | 'slideUp'
  | 'slideLeft'
  | 'slideRight'
  | 'highlight'
  | 'shake'
  | 'bounce';

/**
 * Easing functions
 */
export type EasingFunction =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic'
  | 'backIn'
  | 'backOut';

/**
 * Animation configuration
 */
export interface AnimationConfig {
  type: AnimationType;
  duration: number; // ms
  delay?: number; // ms
  easing?: EasingFunction;
  loop?: boolean;
  repeat?: number;
  direction?: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
  from?: Partial<AnimationKeyframe>;
  to?: Partial<AnimationKeyframe>;
  keyframes?: AnimationKeyframe[];
}

/**
 * Animation keyframe
 */
export interface AnimationKeyframe {
  at: number; // percentage (0-100)
  transform?: TransformProperties;
  opacity?: number;
  background?: string | number;
  color?: string | number;
  border?: string | number;
  padding?: Partial<{ top: number; right: number; bottom: number; left: number }>;
  margin?: Partial<{ top: number; right: number; bottom: number; left: number }>;
}

/**
 * Transform properties
 */
export interface TransformProperties {
  translateX?: number;
  translateY?: number;
  translateZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  rotate?: number; // degrees
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  skewX?: number;
  skewY?: number;
}

/**
 * Animation state
 */
export interface AnimationState {
  id: string;
  type: AnimationType;
  startTime: number;
  endTime: number;
  isPlaying: boolean;
  isPaused: boolean;
  isComplete: boolean;
  progress: number; // 0-1
  currentFrame: number;
  transform: TransformProperties;
  opacity: number;
  backgroundColor: number | string;
  foregroundColor: number | string;
}

/**
 * Animation system configuration
 */
export interface AnimationSystemConfig {
  enabled: boolean;
  defaultDuration: number;
  easingFunctions: Map<EasingFunction, (t: number) => number>;
  performanceMode: 'high' | 'normal' | 'low';
  maxConcurrentAnimations: number;
  enableTransitions: boolean;
  enableEffects: boolean;
}

/**
 * Animation system for terminal-based animations
 */
export class AnimationSystem extends EventEmitter {
  private config: AnimationSystemConfig;
  private animations: Map<string, AnimationState>;
  private animationFrameId: number | null = null;
  private activeAnimations: number = 0;

  constructor() {
    super();
    this.animations = new Map();
    this.config = this.getDefaultConfig();
    this.initializeEasingFunctions();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AnimationSystemConfig {
    return {
      enabled: true,
      defaultDuration: 300,
      easingFunctions: new Map(),
      performanceMode: 'normal',
      maxConcurrentAnimations: 10,
      enableTransitions: true,
      enableEffects: true
    };
  }

  /**
   * Initialize easing functions
   */
  private initializeEasingFunctions(): void {
    const easeFunctions = new Map<EasingFunction, (t: number) => number>();

    // Linear
    easeFunctions.set('linear', (t) => t);

    // Ease in
    easeFunctions.set('easeIn', (t) => t * t * t);

    // Ease out
    easeFunctions.set('easeOut', (t) => 1 - Math.pow(1 - t, 3));

    // Ease in out
    easeFunctions.set('easeInOut', (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Bounce
    easeFunctions.set('bounce', (t) => {
      if (t < 1 / 2.75) {
        return 7.5625 * t * t;
      } else if (t < 2 / 2.75) {
        t -= 1.5 / 2.75;
        return 7.5625 * t * t + 0.75;
      } else if (t < 2.5 / 2.75) {
        t -= 2.25 / 2.75;
        return 7.5625 * t * t + 0.9375;
      } else {
        t -= 2.625 / 2.75;
        return 7.5625 * t * t + 0.984375;
      }
    });

    // Back
    easeFunctions.set('backIn', (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return c3 * t * t * t - c1 * t * t;
    });

    easeFunctions.set('backOut', (t) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    });

    this.config.easingFunctions = easeFunctions;
  }

  /**
   * Create a new animation
   */
  createAnimation(id: string, config: AnimationConfig): AnimationState {
    const state: AnimationState = {
      id,
      type: config.type,
      startTime: Date.now() + (config.delay || 0),
      endTime: Date.now() + (config.delay || 0) + config.duration,
      isPlaying: false,
      isPaused: false,
      isComplete: false,
      progress: 0,
      currentFrame: 0,
      transform: {},
      opacity: 1,
      backgroundColor: 0,
      foregroundColor: 7
    };

    this.animations.set(id, state);
    this.emit('animationCreated', { id, state, config });

    // Start animation if no delay
    if (!config.delay) {
      this.startAnimation(id);
    }

    return state;
  }

  /**
   * Start an animation
   */
  startAnimation(id: string): void {
    const state = this.animations.get(id);
    if (!state) return;

    if (state.isPaused) {
      state.isPaused = false;
    } else {
      state.startTime = Date.now();
      state.endTime = Date.now() + (this.config.defaultDuration);
    }

    state.isPlaying = true;
    state.isComplete = false;
    state.progress = 0;

    if (this.activeAnimations === 0) {
      this.startAnimationLoop();
    }

    this.activeAnimations++;
    this.emit('animationStarted', { id, state });
  }

  /**
   * Pause an animation
   */
  pauseAnimation(id: string): void {
    const state = this.animations.get(id);
    if (!state || !state.isPlaying) return;

    state.isPlaying = false;
    state.isPaused = true;
    state.endTime = Date.now() + (state.endTime - state.startTime);

    this.activeAnimations--;
    this.emit('animationPaused', { id, state });
  }

  /**
   * Resume an animation
   */
  resumeAnimation(id: string): void {
    const state = this.animations.get(id);
    if (!state || !state.isPaused) return;

    const remainingTime = state.endTime - Date.now();
    state.startTime = Date.now();
    state.endTime = Date.now() + remainingTime;
    state.isPlaying = true;
    state.isPaused = false;

    this.activeAnimations++;
    this.emit('animationResumed', { id, state });
  }

  /**
   * Stop an animation
   */
  stopAnimation(id: string, complete: boolean = false): void {
    const state = this.animations.get(id);
    if (!state) return;

    state.isPlaying = false;
    state.isPaused = false;
    state.isComplete = complete;

    if (complete) {
      state.progress = 1;
    }

    this.activeAnimations--;
    this.emit('animationStopped', { id, state, complete });

    if (this.activeAnimations === 0) {
      this.stopAnimationLoop();
    }
  }

  /**
   * Remove an animation
   */
  removeAnimation(id: string): void {
    const state = this.animations.get(id);
    if (state && state.isPlaying) {
      this.activeAnimations--;
      if (this.activeAnimations === 0) {
        this.stopAnimationLoop();
      }
    }

    this.animations.delete(id);
    this.emit('animationRemoved', { id });
  }

  /**
   * Animation loop
   */
  private startAnimationLoop(): void {
    if (!this.config.enabled) return;

    const loop = () => {
      const now = Date.now();
      let hasActiveAnimations = false;

      this.animations.forEach((state, id) => {
        if (state.isPlaying && now >= state.startTime) {
          hasActiveAnimations = true;
          this.updateAnimation(state, now);
        }
      });

      if (hasActiveAnimations) {
        // Use setTimeout for Node.js environment
        setTimeout(loop, 16); // ~60fps
      }
    };

    loop();
  }

  /**
   * Update animation state
   */
  private updateAnimation(state: AnimationState, now: number): void {
    const elapsed = now - state.startTime;
    const duration = state.endTime - state.startTime;

    // Calculate progress
    state.progress = Math.min(elapsed / duration, 1);

    // Apply easing
    const easedProgress = this.applyEasing(state.progress);

    // Update current frame
    const totalFrames = Math.ceil(duration / 16); // ~60fps
    state.currentFrame = Math.floor(easedProgress * totalFrames);

    // Update animation properties based on type
    this.updateAnimationProperties(state, easedProgress);

    // Check if animation is complete
    if (state.progress >= 1) {
      state.isComplete = true;
      state.isPlaying = false;
      this.activeAnimations--;
      this.emit('animationComplete', { id: state.id, state });

      if (this.activeAnimations === 0) {
        this.stopAnimationLoop();
      }
    }
  }

  /**
   * Apply easing function
   */
  private applyEasing(progress: number): number {
    const easing = 'easeInOut'; // Default easing
    const easingFunction = this.config.easingFunctions.get(easing);
    return easingFunction ? easingFunction(progress) : progress;
  }

  /**
   * Update animation properties based on type
   */
  private updateAnimationProperties(state: AnimationState, progress: number): void {
    switch (state.type) {
      case 'fade':
        state.opacity = Math.sin(progress * Math.PI);
        break;

      case 'blink':
        state.opacity = progress < 0.5 ? 1 : 0;
        break;

      case 'pulse':
        state.opacity = 0.7 + 0.3 * Math.sin(progress * Math.PI * 4);
        break;

      case 'typewriter':
        // Typewriter effect would be handled at component level
        break;

      case 'progress':
        state.opacity = 1;
        state.transform = { scaleX: progress };
        break;

      case 'highlight':
        state.opacity = 0.3 + 0.3 * Math.sin(progress * Math.PI);
        break;

      case 'shake':
        state.transform = {
          translateX: Math.sin(progress * Math.PI * 8) * 2,
          translateY: Math.sin(progress * Math.PI * 6) * 1
        };
        break;

      case 'bounce':
        state.transform = {
          translateY: Math.sin(progress * Math.PI) * 2
        };
        break;

      case 'rotation':
        state.transform = { rotate: progress * 360 };
        break;

      case 'slide':
      case 'slideDown':
      case 'slideUp':
      case 'slideLeft':
      case 'slideRight':
        this.updateSlideAnimation(state, progress, state.type);
        break;

      case 'scale':
        state.transform = {
          scaleX: 0.5 + progress * 0.5,
          scaleY: 0.5 + progress * 0.5
        };
        break;

      default:
        state.transform = { translateX: progress * 10 };
    }
  }

  /**
   * Update slide animation properties
   */
  private updateSlideAnimation(state: AnimationState, progress: number, type: AnimationType): void {
    const range = 5; // Number of characters to slide

    switch (type) {
      case 'slideDown':
        state.transform = { translateY: progress * range };
        break;
      case 'slideUp':
        state.transform = { translateY: -progress * range };
        break;
      case 'slideLeft':
        state.transform = { translateX: -progress * range };
        break;
      case 'slideRight':
        state.transform = { translateX: progress * range };
        break;
      default:
        state.transform = { translateX: progress * range };
    }
  }

  /**
   * Render animated element
   */
  renderAnimatedElement(
    id: string,
    content: string,
    x: number,
    y: number,
    width: number = content.length
  ): string {
    const state = this.animations.get(id);
    if (!state || !state.isPlaying) {
      return content;
    }

    let output = '';
    let animatedContent = content;

    // Apply typewriter effect
    if (state.type === 'typewriter') {
      const charCount = Math.floor(state.progress * content.length);
      animatedContent = content.substring(0, charCount);
    }

    // Apply transform effects
    if (state.transform.translateX !== 0) {
      // Horizontal translation
      const offsetX = Math.round(state.transform.translateX);
      output += AnsiUtils.moveCursor(x + offsetX, y);
    }

    if (state.transform.translateY !== 0) {
      // Vertical translation
      const offsetY = Math.round(state.transform.translateY);
      output += AnsiUtils.moveCursor(x, y + offsetY);
    }

    // Apply opacity/dimming
    if (state.opacity < 1) {
      const dimmedText = AnsiUtils.dim() + animatedContent + AnsiUtils.reset();
      output += dimmedText;
    } else {
      output += animatedContent;
    }

    // Apply color effects
    if (state.backgroundColor !== 0) {
      output = AnsiUtils.colorText(output, state.backgroundColor);
    }

    return output;
  }

  /**
   * Create CSS animation string (for terminal applications that support it)
   */
  createAnimationString(config: AnimationConfig): string {
    const keyframes = this.generateKeyframes(config);
    const selector = `.animate-${config.type}`;

    return `
@keyframes ${config.type} {
  ${keyframes}
}
${selector} {
  animation: ${config.type} ${config.duration}ms ${config.easing || 'easeInOut'};
  ${config.fillMode ? `animation-fill-mode: ${config.fillMode};` : ''}
  ${config.loop ? `animation-iteration-count: infinite;` : ''}
  ${config.repeat ? `animation-iteration-count: ${config.repeat};` : ''}
  ${config.delay ? `animation-delay: ${config.delay}ms;` : ''}
}`;
  }

  /**
   * Generate keyframes for animation
   */
  private generateKeyframes(config: AnimationConfig): string {
    const keyframes: string[] = [];

    if (config.keyframes) {
      config.keyframes.forEach(kf => {
        keyframes.push(`${kf.at}% { ${this.generateStyleString(kf)} }`);
      });
    } else {
      // Generate default keyframes
      keyframes.push(`0% { ${this.generateStyleString(config.from)} }`);
      keyframes.push(`100% { ${this.generateStyleString(config.to)} }`);
    }

    return keyframes.join('\n  ');
  }

  /**
   * Generate style string from keyframe
   */
  private generateStyleString(keyframe: Partial<AnimationKeyframe>): string {
    const styles: string[] = [];

    if (keyframe.opacity !== undefined) {
      styles.push(`opacity: ${keyframe.opacity};`);
    }

    if (keyframe.transform) {
      const transforms: string[] = [];
      const t = keyframe.transform;

      if (t.translateX) transforms.push(`translateX(${t.translateX}ch)`);
      if (t.translateY) transforms.push(`translateY(${t.translateY}ch)`);
      if (t.scaleX) transforms.push(`scaleX(${t.scaleX})`);
      if (t.scaleY) transforms.push(`scaleY(${t.scaleY})`);
      if (t.rotate) transforms.push(`rotate(${t.rotate}deg)`);

      if (transforms.length > 0) {
        styles.push(`transform: ${transforms.join(' ')};`);
      }
    }

    return styles.join(' ');
  }

  /**
   * Set animation configuration
   */
  setConfig(config: Partial<AnimationSystemConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChanged', this.config);
  }

  /**
   * Enable/disable animations
   */
  setEnabled(enabled: boolean): void {
    if (enabled === this.config.enabled) return;

    this.config.enabled = enabled;

    if (!enabled) {
      // Stop all animations
      this.animations.forEach((state, id) => {
        this.stopAnimation(id, false);
      });
      this.stopAnimationLoop();
    }

    this.emit('enabledChanged', { enabled });
  }

  /**
   * Get animation state
   */
  getAnimationState(id: string): AnimationState | undefined {
    return this.animations.get(id);
  }

  /**
   * Get all animation states
   */
  getAllAnimationStates(): AnimationState[] {
    return Array.from(this.animations.values());
  }

  /**
   * Stop animation loop
   */
  private stopAnimationLoop(): void {
    // Animation loop uses setTimeout, it will stop naturally
    this.animationFrameId = null;
  }

  /**
   * Get current configuration
   */
  getConfig(): AnimationSystemConfig {
    return { ...this.config };
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopAnimationLoop();
    this.animations.clear();
    this.removeAllListeners();
  }
}