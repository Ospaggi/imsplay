/**
 * vgm-types.ts - VGM player type definitions
 */

// ============================================================================
// VGM File Types
// ============================================================================

export interface VGMHeader {
  magic: string;           // "Vgm " at offset 0x00
  eofOffset: number;       // End of file offset (0x04)
  version: number;         // VGM version (0x08)
  gd3Offset: number;       // GD3 tag offset (0x14)
  totalSamples: number;    // Total samples (0x18)
  loopOffset: number;      // Loop point offset (0x1C)
  loopSamples: number;     // Samples in loop (0x20)
  ym3812Clock: number;     // YM3812 clock (0x50, 3579545 typical)
  dataOffset: number;      // VGM data offset (absolute)
}

export type VGMCommandType = 'write' | 'wait' | 'end';

export interface VGMCommand {
  type: VGMCommandType;
  register?: number;       // For write commands
  value?: number;          // For write commands
  samples?: number;        // For wait commands
  absoluteSample: number;  // Absolute sample position
}

export interface VGMData {
  header: VGMHeader;
  commands: VGMCommand[];
}

// ============================================================================
// VGM Playback Types
// ============================================================================

export interface VGMPlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSample: number;      // Current sample position
  totalSamples: number;       // Total samples in file
  volume: number;             // Master volume (0-127)
  loopEnabled: boolean;
  fileName?: string;
  // Progress tracking
  progress: number;           // 0-1 progress
  currentTime: number;        // Current time in seconds
  totalDuration: number;      // Total duration in seconds
  // Channel tracking (for visualization)
  channelVolumes: number[];   // 9 channels, 0-127
  activeNotes: Array<{ channel: number; note: number }>;
}
