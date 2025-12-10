import { EventEmitter } from 'events';

/**
 * Audio cue types
 */
export type AudioCueType = 'focus' | 'select' | 'error' | 'success' | 'warning' | 'navigation' | 'notification';

/**
 * Sound synthesis configuration
 */
export interface SoundConfig {
    frequency: number; // Hz
    duration: number; // ms
    volume: number; // 0-1
    waveType: 'sine' | 'square' | 'sawtooth' | 'triangle';
    envelope?: {
        attack?: number; // ms
        decay?: number; // ms
        sustain?: number; // 0-1
        release?: number; // ms
    };
}

/**
 * Audio system configuration
 */
export interface AudioSystemConfig {
    enabled: boolean;
    outputMode: 'simulated' | 'terminal' | 'external';
    outputDevice?: string;
    volume: number; // 0-1
    masterVolume: number; // 0-1
    soundProfile: 'basic' | 'enhanced' | 'full';
    customSounds: Map<AudioCueType, SoundConfig>;
}

/**
 * Audio channel for independent sound playback
 */
export interface AudioChannel {
    id: string;
    volume: number;
    playing: boolean;
    sound?: SoundConfig;
}

/**
 * Audio system for terminal audio cues
 */
export class AudioSystem extends EventEmitter {
    private config: AudioSystemConfig;
    private channels: Map<string, AudioChannel>;
    private isInitialized: boolean = false;

    constructor() {
        super();
        this.channels = new Map();
        this.config = this.getDefaultConfig();
        this.initialize();
    }

    /**
     * Get default audio configuration
     */
    private getDefaultConfig(): AudioSystemConfig {
        return {
            enabled: true,
            outputMode: 'simulated',
            outputDevice: 'default',
            volume: 0.5,
            masterVolume: 0.7,
            soundProfile: 'enhanced',
            customSounds: new Map()
        };
    }

    /**
     * Initialize audio system
     */
    private initialize(): void {
        if (!this.config.enabled) {
            return;
        }

        this.isInitialized = true;
        this.createDefaultChannels();

        // Log initialization
        this.emit('initialized', {
            mode: this.config.outputMode,
            channels: this.channels.size,
            volume: this.config.volume
        });
    }

    /**
     * Create default audio channels
     */
    private createDefaultChannels(): void {
        // Create channels for different cue types
        const channelNames = ['main', 'background', 'foreground', 'alerts', 'notifications'];

        channelNames.forEach(name => {
            this.addChannel(name, {
                id: name,
                volume: this.config.volume,
                playing: false
            });
        });
    }

    /**
     * Add audio channel
     */
    addChannel(channelId: string, channel: AudioChannel): void {
        this.channels.set(channelId, channel);
        this.emit('channelAdded', { channelId, channel });
    }

    /**
     * Remove audio channel
     */
    removeChannel(channelId: string): void {
        this.channels.delete(channelId);
        this.emit('channelRemoved', { channelId });
    }

    /**
     * Get audio channel
     */
    getChannel(channelId: string): AudioChannel | undefined {
        return this.channels.get(channelId);
    }

    /**
     * Play sound cue
     */
    async playCue(type: AudioCueType, options: Partial<SoundConfig> = {}): Promise<void> {
        if (!this.config.enabled || !this.isInitialized) {
            return;
        }

        // Check if we have a custom sound for this type
        const soundConfig = this.config.customSounds.get(type) || this.getDefaultSound(type);

        // Merge options
        const finalConfig: SoundConfig = {
            ...soundConfig,
            ...options,
            volume: Math.min(this.config.volume, this.config.masterVolume) * (options.volume || 1)
        };

        // Play sound based on output mode
        switch (this.config.outputMode) {
            case 'simulated':
                this.playSimulatedSound(finalConfig, type);
                break;
            case 'terminal':
                this.playTerminalSound(finalConfig, type);
                break;
            case 'external':
                this.playExternalSound(finalConfig, type);
                break;
        }
    }

    /**
     * Get default sound for cue type
     */
    private getDefaultSound(type: AudioCueType): SoundConfig {
        const defaultSounds = new Map<AudioCueType, SoundConfig>([
            ['focus', {
                frequency: 440,  // A4
                duration: 50,
                volume: 0.3,
                waveType: 'sine',
                envelope: { attack: 5, decay: 10, sustain: 0.2, release: 5 }
            }],
            ['select', {
                frequency: 523,  // C5
                duration: 100,
                volume: 0.4,
                waveType: 'sine',
                envelope: { attack: 5, decay: 15, sustain: 0.3, release: 10 }
            }],
            ['error', {
                frequency: 220,  // A3
                duration: 200,
                volume: 0.5,
                waveType: 'square',
                envelope: { attack: 10, decay: 20, sustain: 0.4, release: 20 }
            }],
            ['success', {
                frequency: 659,  // E5
                duration: 150,
                volume: 0.4,
                waveType: 'triangle',
                envelope: { attack: 10, decay: 30, sustain: 0.5, release: 15 }
            }],
            ['warning', {
                frequency: 330,  // E4
                duration: 150,
                volume: 0.4,
                waveType: 'sawtooth',
                envelope: { attack: 15, decay: 25, sustain: 0.3, release: 20 }
            }],
            ['navigation', {
                frequency: 392,  // G4
                duration: 50,
                volume: 0.2,
                waveType: 'sine',
                envelope: { attack: 3, decay: 5, sustain: 0.1, release: 5 }
            }],
            ['notification', {
                frequency: 880,  // A5
                duration: 200,
                volume: 0.3,
                waveType: 'sine',
                envelope: { attack: 20, decay: 40, sustain: 0.4, release: 30 }
            }]
        ]);

        return defaultSounds.get(type) || {
            frequency: 440,
            duration: 100,
            volume: 0.3,
            waveType: 'sine'
        };
    }

    /**
     * Simulate sound playback (for testing/development)
     */
    private playSimulatedSound(config: SoundConfig, type: AudioCueType): void {
        console.log(`[Audio] Playing ${type}: ${config.frequency}Hz for ${config.duration}ms at ${(config.volume * 100).toFixed(0)}%`);

        // Emit play event
        this.emit('soundPlayed', { type, config, timestamp: Date.now() });

        // Simulate playback duration
        setTimeout(() => {
            this.emit('soundComplete', { type, timestamp: Date.now() });
        }, config.duration);
    }

    /**
     * Play terminal-compatible sound using ANSI sequences
     */
    private playTerminalSound(config: SoundConfig, type: AudioCueType): void {
        // Generate ANSI bell sequence for basic feedback
        const bellSequence = '\x07';

        // Use printf or echo for terminal control sequences
        const playCommand = `printf '\\a'`;

        // Calculate number of bells based on volume and duration
        const bellCount = Math.max(1, Math.min(3, Math.floor(config.volume * 3)));

        for (let i = 0; i < bellCount; i++) {
            process.stdout.write(bellSequence);

            // Small delay between bells
            if (i < bellCount - 1) {
                setTimeout(() => {}, config.duration / bellCount);
            }
        }

        this.emit('soundPlayed', { type, config, timestamp: Date.now() });
        setTimeout(() => {
            this.emit('soundComplete', { type, timestamp: Date.now() });
        }, config.duration);
    }

    /**
     * Play external sound using system commands
     */
    private playExternalSound(config: SoundConfig, type: AudioCueType): void {
        // Cross-platform sound generation
        const { platform } = process;

        try {
            if (platform === 'darwin') {
                // macOS: use afplay with generated sound
                this.playDarwinSound(config);
            } else if (platform === 'linux') {
                // Linux: use beep or aplay
                this.playLinuxSound(config);
            } else if (platform === 'win32') {
                // Windows: use PowerShell beep
                this.playWindowsSound(config);
            } else {
                // Fallback to simulated sound
                this.playSimulatedSound(config, type);
            }
        } catch (error) {
            console.warn(`[Audio] Failed to play external sound: ${error}`);
            // Fallback to simulated sound
            this.playSimulatedSound(config, type);
        }
    }

    /**
     * Play sound on macOS using afplay
     */
    private playDarwinSound(config: SoundConfig): void {
        // Generate a simple beep using printf and afplay
        // This is a simplified version - real implementation would use audio generation
        const command = `osascript -e "beep"`;

        // Play with appropriate duration
        const { exec } = require('child_process');
        exec(command, (error: any) => {
            if (error) {
                console.error(`[Audio] macOS beep error: ${error}`);
            }
        });

        this.emit('soundPlayed', { type: 'external', config, timestamp: Date.now() });
        setTimeout(() => {
            this.emit('soundComplete', { type: 'external', timestamp: Date.now() });
        }, config.duration);
    }

    /**
     * Play sound on Linux
     */
    private playLinuxSound(config: SoundConfig): void {
        // Try to use beep if available
        const { exec } = require('child_process');

        // Check if beep command is available
        exec('which beep', (error: any, stdout: string, stderr: string) => {
            if (!error && stdout.trim()) {
                // Use beep command
                const command = `beep -f ${config.frequency} -l ${config.duration} -p ${config.volume * 100}`;
                exec(command, (error: any) => {
                    if (error) {
                        console.error(`[Audio] Linux beep error: ${error}`);
                    }
                });
            } else {
                // Fallback to terminal bell
                this.playTerminalSound(config, 'fallback');
            }
        });

        this.emit('soundPlayed', { type: 'external', config, timestamp: Date.now() });
        setTimeout(() => {
            this.emit('soundComplete', { type: 'external', timestamp: Date.now() });
        }, config.duration);
    }

    /**
     * Play sound on Windows
     */
    private playWindowsSound(config: SoundConfig): void {
        // Use PowerShell beep
        const { exec } = require('child_process');
        const powershellCommand = `$([Console]::Beep(${config.frequency}, ${config.duration}))`;

        exec(`powershell -Command "${powershellCommand}"`, (error: any) => {
            if (error) {
                console.error(`[Audio] Windows beep error: ${error}`);
            }
        });

        this.emit('soundPlayed', { type: 'external', config, timestamp: Date.now() });
        setTimeout(() => {
            this.emit('soundComplete', { type: 'external', timestamp: Date.now() });
        }, config.duration);
    }

    /**
     * Stop all playing sounds
     */
    stopAllSounds(): void {
        this.channels.forEach(channel => {
            if (channel.playing) {
                channel.playing = false;
                this.emit('soundStopped', { channelId: channel.id, timestamp: Date.now() });
            }
        });
    }

    /**
     * Set volume for a specific channel
     */
    setChannelVolume(channelId: string, volume: number): void {
        const channel = this.getChannel(channelId);
        if (channel) {
            channel.volume = Math.max(0, Math.min(1, volume));
            this.emit('channelVolumeChanged', { channelId, volume });
        }
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume: number): void {
        this.config.masterVolume = Math.max(0, Math.min(1, volume));
        this.emit('masterVolumeChanged', { volume: this.config.masterVolume });
    }

    /**
     * Set sound profile
     */
    setSoundProfile(profile: AudioSystemConfig['soundProfile']): void {
        this.config.soundProfile = profile;
        this.emit('soundProfileChanged', { profile });
    }

    /**
     * Enable/disable audio system
     */
    setEnabled(enabled: boolean): void {
        const wasEnabled = this.config.enabled;
        this.config.enabled = enabled;

        if (enabled && !wasEnabled) {
            this.initialize();
        } else if (!enabled && wasEnabled) {
            this.stopAllSounds();
        }

        this.emit('enabledChanged', { enabled });
    }

    /**
     * Set output mode
     */
    setOutputMode(mode: AudioSystemConfig['outputMode']): void {
        this.config.outputMode = mode;
        this.emit('outputModeChanged', { mode });
    }

    /**
     * Set custom sound for cue type
     */
    setCustomSound(type: AudioCueType, sound: SoundConfig): void {
        this.config.customSounds.set(type, sound);
        this.emit('customSoundSet', { type, sound });
    }

    /**
     * Get current configuration
     */
    getConfig(): AudioSystemConfig {
        return { ...this.config };
    }

    /**
     * Test all audio cues
     */
    async testAllCues(): Promise<void> {
        const cueTypes: AudioCueType[] = [
            'focus', 'select', 'error', 'success', 'warning', 'navigation', 'notification'
        ];

        for (const type of cueTypes) {
            await this.playCue(type);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    /**
     * Get system audio capabilities
     */
    getCapabilities(): {
        outputModes: string[];
        supportsExternal: boolean;
        supportedWaveTypes: string[];
        maxFrequency: number;
        minFrequency: number;
    } {
        return {
            outputModes: ['simulated', 'terminal', 'external'],
            supportsExternal: true,
            supportedWaveTypes: ['sine', 'square', 'sawtooth', 'triangle'],
            maxFrequency: 20000,
            minFrequency: 20
        };
    }

    /**
     * Clean up resources
     */
    cleanup(): void {
        this.stopAllSounds();
        this.removeAllListeners();
        this.isInitialized = false;
    }
}