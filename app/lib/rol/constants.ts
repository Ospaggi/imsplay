/**
 * constants.ts - ADLIB.H 상수 포팅
 *
 * AdLib OPL2 사운드 칩 파라미터 정의
 * 원본: /Users/gcjjyy/oscc/adlib/erol/ADLIB.H
 */

// Parameters of each voice (각 음색의 파라미터 수)
export const nbLocParam = 14;

// Local parameters (슬롯별 파라미터 인덱스)
export const prmKsl = 0;           // Key Scale Level
export const prmMulti = 1;         // Frequency Multiplier
export const prmFeedBack = 2;      // Feedback (operator 0에만 사용)
export const prmAttack = 3;        // Attack rate
export const prmSustain = 4;       // Sustain level
export const prmStaining = 5;      // Sustaining (EG-TYP)
export const prmDecay = 6;         // Decay rate
export const prmRelease = 7;       // Release rate
export const prmLevel = 8;         // Output level
export const prmAm = 9;            // Amplitude Modulation
export const prmVib = 10;          // Vibrato
export const prmKsr = 11;          // Key Scale Rate
export const prmFm = 12;           // FM (operator 0에만 사용)
export const prmWaveSel = 13;      // Wave select

// Global parameters (전역 파라미터 인덱스)
export const prmAmDepth = 14;      // AM depth
export const prmVibDepth = 15;     // Vibrato depth
export const prmNoteSel = 16;      // Note select
export const prmPercussion = 17;   // Percussion mode

// Melodic voice numbers (멜로디 채널 번호)
export const vMelo0 = 0;
export const vMelo1 = 1;
export const vMelo2 = 2;
export const vMelo3 = 3;
export const vMelo4 = 4;
export const vMelo5 = 5;
export const vMelo6 = 6;
export const vMelo7 = 7;
export const vMelo8 = 8;

// Percussive voice numbers (타악기 채널 번호)
export const BD = 6;               // Bass Drum
export const SD = 7;               // Snare Drum
export const TOM = 8;              // Tom
export const CYMB = 9;             // Cymbal
export const HIHAT = 10;           // Hi-Hat

// Volume constants (볼륨 상수)
export const MAX_VOLUME = 0x7f;    // 127
export const LOG2_VOLUME = 7;      // log2(MAX_VOLUME)

// Pitch constants (피치 상수)
export const MAX_PITCH = 0x3fff;   // 16383
export const MID_PITCH = 0x2000;   // 8192 (no detune)

// MIDI constants (MIDI 상수)
export const MID_C = 60;           // MIDI standard middle C
export const CHIP_MID_C = 48;      // Sound chip middle C
export const NR_NOTES = 96;        // Number of notes we can play on chip

// TOM and SD pitch settings for percussion mode
export const TOM_PITCH = 24;       // Best frequency for TOM
export const TOM_TO_SD = 7;        // Half-tones between TOM and SD
export const SD_PITCH = TOM_PITCH + TOM_TO_SD;

// Frequency numbers table for each half-tone
// C, C#, D, D#, E, F, F#, G, G#, A, A#, B
export const freqNums = [
  343, 363, 385, 408, 432, 458,
  485, 514, 544, 577, 611, 647
] as const;

// Slot numbers as a function of the voice and the operator (melodic mode)
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

// Slot numbers for percussive voices
// 255 indicates only one slot used by the voice
export const slotPVoice: readonly [number, number][] = [
  [0, 3],      // voice 0
  [1, 4],      // voice 1
  [2, 5],      // voice 2
  [6, 9],      // voice 3
  [7, 10],     // voice 4
  [8, 11],     // voice 5
  [12, 15],    // Bass Drum: slot 12 and 15
  [16, 255],   // SD: slot 16
  [14, 255],   // TOM: slot 14
  [17, 255],   // TOP-CYM: slot 17
  [13, 255]    // HH: slot 13
] as const;

// Offset of each slot within the chip
export const offsetSlot = [
  0, 1, 2, 3, 4, 5,
  8, 9, 10, 11, 12, 13,
  16, 17, 18, 19, 20, 21
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

// Voice number associated with each slot (melodic mode)
export const voiceMSlot = [
  0, 1, 2,
  0, 1, 2,
  3, 4, 5,
  3, 4, 5,
  6, 7, 8,
  6, 7, 8
] as const;

// Voice number associated with each slot (percussive mode)
export const voicePSlot = [
  0, 1, 2,
  0, 1, 2,
  3, 4, 5,
  3, 4, 5,
  BD, HIHAT, TOM,
  BD, SD, CYMB
] as const;

// Percussion masks for percBits
export const percMasks = [
  0x10, 0x08, 0x04, 0x02, 0x01
] as const;

// Default electric piano voice parameters
// Operator 0 (modulator)
export const pianoParamsOp0 = [
  1, 1, 3, 15, 5, 0, 1, 3, 15, 0, 0, 0, 1, 0
] as const;

// Operator 1 (carrier)
export const pianoParamsOp1 = [
  0, 1, 1, 15, 7, 0, 2, 4, 0, 0, 0, 1, 0, 0
] as const;

// Default percussive voice parameters
export const bdOpr0 = [0, 0, 0, 10, 4, 0, 8, 12, 11, 0, 0, 0, 1, 0] as const;
export const bdOpr1 = [0, 0, 0, 13, 4, 0, 6, 15, 0, 0, 0, 0, 1, 0] as const;
export const sdOpr = [0, 12, 0, 15, 11, 0, 8, 5, 0, 0, 0, 0, 0, 0] as const;
export const tomOpr = [0, 4, 0, 15, 11, 0, 7, 5, 0, 0, 0, 0, 0, 0] as const;
export const cymbOpr = [0, 1, 0, 15, 11, 0, 5, 5, 0, 0, 0, 0, 0, 0] as const;
export const hhOpr = [0, 1, 0, 15, 11, 0, 7, 5, 0, 0, 0, 0, 0, 0] as const;
