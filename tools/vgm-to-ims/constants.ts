/**
 * constants.ts - VGM and OPL2 constants
 */

// ============================================================================
// VGM Command Codes
// ============================================================================

export const VGM_CMD_YM3812_WRITE = 0x5a;  // 0x5A aa dd - Write dd to register aa
export const VGM_CMD_WAIT_LONG = 0x61;     // 0x61 nn nn - Wait n samples (16-bit LE)
export const VGM_CMD_WAIT_NTSC = 0x62;     // Wait 735 samples (1/60 second)
export const VGM_CMD_WAIT_PAL = 0x63;      // Wait 882 samples (1/50 second)
export const VGM_CMD_END = 0x66;           // End of data
// 0x70-0x7F: Short wait, (cmd & 0x0F) + 1 samples

export const VGM_WAIT_NTSC_SAMPLES = 735;
export const VGM_WAIT_PAL_SAMPLES = 882;
export const VGM_SAMPLE_RATE = 44100;

// ============================================================================
// VGM Header Offsets
// ============================================================================

export const VGM_OFFSET_MAGIC = 0x00;      // "Vgm " (4 bytes)
export const VGM_OFFSET_EOF = 0x04;        // EOF offset
export const VGM_OFFSET_VERSION = 0x08;    // Version
export const VGM_OFFSET_GD3 = 0x14;        // GD3 tag offset
export const VGM_OFFSET_TOTAL_SAMPLES = 0x18;
export const VGM_OFFSET_LOOP_OFFSET = 0x1c;
export const VGM_OFFSET_LOOP_SAMPLES = 0x20;
export const VGM_OFFSET_DATA = 0x34;       // Data offset (relative to 0x34)
export const VGM_OFFSET_YM3812_CLOCK = 0x50;

// ============================================================================
// OPL2 Register Ranges
// ============================================================================

// Operator parameters (per-slot registers)
export const OPL_REG_AVEK_START = 0x20;    // AM/VIB/EG/KSR/MULT
export const OPL_REG_AVEK_END = 0x35;
export const OPL_REG_KSL_START = 0x40;     // KSL/Level
export const OPL_REG_KSL_END = 0x55;
export const OPL_REG_AD_START = 0x60;      // Attack/Decay
export const OPL_REG_AD_END = 0x75;
export const OPL_REG_SR_START = 0x80;      // Sustain/Release
export const OPL_REG_SR_END = 0x95;
export const OPL_REG_WAVE_START = 0xe0;    // Waveform
export const OPL_REG_WAVE_END = 0xf5;

// Channel parameters
export const OPL_REG_FNUM_LOW_START = 0xa0;  // F-Num low 8 bits
export const OPL_REG_FNUM_LOW_END = 0xa8;
export const OPL_REG_KEYON_START = 0xb0;     // Key-On, Block, F-Num high 2 bits
export const OPL_REG_KEYON_END = 0xb8;
export const OPL_REG_FB_START = 0xc0;        // Feedback/Connection
export const OPL_REG_FB_END = 0xc8;

// Key-On bit mask
export const OPL_KEYON_MASK = 0x20;

// Rhythm mode register
export const OPL_REG_RHYTHM = 0xbd;
export const OPL_RHYTHM_MODE_MASK = 0x20;  // Bit 5 = percussion mode

// ============================================================================
// OPL2 Slot Mappings (from app/lib/rol/constants.ts)
// ============================================================================

// Offset of each slot within the chip (for register calculations)
export const offsetSlot = [
  0, 1, 2, 3, 4, 5,
  8, 9, 10, 11, 12, 13,
  16, 17, 18, 19, 20, 21
] as const;

// Reverse mapping: register offset to slot number
export const offsetToSlot: { [key: number]: number } = {};
offsetSlot.forEach((offset, slot) => {
  offsetToSlot[offset] = slot;
});

// Slot numbers as a function of the voice (melodic mode)
// Each voice has 2 operators (modulator, carrier)
export const slotMVoice: readonly [number, number][] = [
  [0, 3],    // voice 0
  [1, 4],    // voice 1
  [2, 5],    // voice 2
  [6, 9],    // voice 3
  [7, 10],   // voice 4
  [8, 11],   // voice 5
  [12, 15],  // voice 6
  [13, 16],  // voice 7
  [14, 17]   // voice 8
] as const;

// Voice number associated with each slot (melodic mode)
export const voiceMSlot = [
  0, 1, 2,
  0, 1, 2,
  3, 4, 5,
  3, 4, 5,
  6, 7, 8,
  6, 7, 8
] as const;

// Carrier slot indicators (0 = modulator, 1 = carrier)
export const carrierSlot = [
  0, 0, 0,  // slots 0, 1, 2
  1, 1, 1,  // slots 3, 4, 5
  0, 0, 0,  // slots 6, 7, 8
  1, 1, 1,  // slots 9, 10, 11
  0, 0, 0,  // slots 12, 13, 14
  1, 1, 1   // slots 15, 16, 17
] as const;

// ============================================================================
// Frequency Table (from app/lib/rol/constants.ts)
// ============================================================================

// Frequency numbers table for each half-tone (block 0)
// C, C#, D, D#, E, F, F#, G, G#, A, A#, B
export const freqNums = [
  343, 363, 385, 408, 432, 458,
  485, 514, 544, 577, 611, 647
] as const;

// ============================================================================
// IMS Constants
// ============================================================================

// IMS event types
export const IMS_EVENT_NOTE_ON_ALWAYS = 0x80;
export const IMS_EVENT_NOTE_ON_COND = 0x90;
export const IMS_EVENT_VOLUME = 0xa0;
export const IMS_EVENT_INSTRUMENT = 0xc0;
export const IMS_EVENT_PITCH_BEND = 0xe0;
export const IMS_EVENT_TEMPO = 0xf0;

// IMS delta time encoding
export const IMS_DELTA_240 = 0xf8;         // Add 240 ticks
export const IMS_DELTA_LOOP = 0xfc;        // Loop marker

// IMS timing
export const IMS_TICKS_PER_BEAT = 240;     // Standard ticks per beat

// IMS header offsets
export const IMS_OFFSET_SONGNAME = 6;      // 30 bytes
export const IMS_OFFSET_BYTESIZE = 42;     // uint32
export const IMS_OFFSET_DMODE = 58;        // uint8
export const IMS_OFFSET_TEMPO = 60;        // uint16
export const IMS_OFFSET_MUSICDATA = 71;    // Music data start

// ============================================================================
// BNK Constants
// ============================================================================

export const BNK_SIGNATURE = 'ADLIB-';
export const BNK_HEADER_SIZE = 20;
export const BNK_LIST_ENTRY_SIZE = 12;
export const BNK_DATA_ENTRY_SIZE = 30;
export const BNK_INSTRUMENT_PARAMS_SIZE = 28;
export const BNK_INSTRUMENT_NAME_SIZE = 9;

// ============================================================================
// Pitch Constants
// ============================================================================

export const CHIP_MID_C = 48;              // Sound chip middle C
export const MID_C = 60;                   // MIDI standard middle C
