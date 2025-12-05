/**
 * types.ts - VGM to IMS converter type definitions
 */

// ============================================================================
// VGM Types
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
// OPL2 State Types
// ============================================================================

export interface OPLOperatorState {
  // 0x20-0x35: AM/VIB/EG/KSR/MULT
  am: boolean;             // Amplitude modulation
  vib: boolean;            // Vibrato
  egt: boolean;            // Envelope type (sustaining)
  ksr: boolean;            // Key scale rate
  mult: number;            // Frequency multiplier (4 bits)

  // 0x40-0x55: KSL/Level
  ksl: number;             // Key scale level (2 bits)
  level: number;           // Output level (6 bits, 0-63)

  // 0x60-0x75: Attack/Decay
  attack: number;          // Attack rate (4 bits)
  decay: number;           // Decay rate (4 bits)

  // 0x80-0x95: Sustain/Release
  sustain: number;         // Sustain level (4 bits)
  release: number;         // Release rate (4 bits)

  // 0xE0-0xF5: Waveform
  waveform: number;        // Waveform select (2 bits)
}

export interface OPLChannelState {
  // Operator parameters (2 operators per melodic channel)
  operators: [OPLOperatorState, OPLOperatorState];

  // Channel state
  fnum: number;            // F-Number (10 bits)
  block: number;           // Block/Octave (3 bits)
  keyOn: boolean;          // Key-on flag

  // 0xC0-0xC8: Feedback/Connection
  feedback: number;        // Feedback (3 bits)
  connection: number;      // Connection type (0=FM, 1=AM)
}

export type OPLEventType = 'noteOn' | 'noteOff' | 'instrumentChange';

export interface OPLEvent {
  type: OPLEventType;
  channel: number;
  note?: number;           // MIDI note number for noteOn/noteOff
  volume?: number;         // Volume for noteOn
  instrumentIndex?: number; // Instrument index for instrumentChange
}

// ============================================================================
// Instrument Types
// ============================================================================

export interface ExtractedInstrument {
  id: number;
  name: string;            // Auto-generated: inst_00, inst_01, etc.
  params: number[];        // 28-byte BNK format
  hash: string;            // For deduplication
}

// ============================================================================
// IMS Types
// ============================================================================

export type IMSEventType =
  | 0x80  // NOTE_ON_ALWAYS
  | 0x90  // NOTE_ON_CONDITIONAL
  | 0xa0  // VOLUME_CHANGE
  | 0xc0  // INSTRUMENT_CHANGE
  | 0xe0  // PITCH_BEND
  | 0xf0; // TEMPO_CHANGE

export interface IMSEvent {
  type: IMSEventType;
  channel: number;         // 0-8 for melodic
  data: number[];          // Event-specific data
  absoluteTick: number;    // Absolute tick position
  orderIndex?: number;     // For stable sorting (instrument change before note on)
}

export interface IMSData {
  songName: string;
  basicTempo: number;
  dMode: number;           // 0=melodic, 1=percussion
  events: IMSEvent[];
  instrumentNames: string[];
}

// ============================================================================
// Converter Types
// ============================================================================

export interface ConverterOptions {
  tempo?: number;          // Base tempo (default: 120)
  songName?: string;       // Song name for IMS header
}

export interface ConversionResult {
  ims: Uint8Array;
  bnk: Uint8Array;
  instrumentCount: number;
  eventCount: number;
}
