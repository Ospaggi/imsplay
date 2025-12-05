/**
 * opl-state-tracker.ts - OPL2 register state tracker
 *
 * Tracks OPL2 register writes to:
 * 1. Extract unique instrument definitions
 * 2. Detect note on/off events
 * 3. Calculate MIDI note numbers from F-Num and Block
 */

import type { OPLOperatorState, OPLChannelState, OPLEvent, ExtractedInstrument } from './types';
import {
  offsetSlot,
  offsetToSlot,
  voiceMSlot,
  carrierSlot,
  slotMVoice,
  freqNums,
  OPL_REG_AVEK_START,
  OPL_REG_AVEK_END,
  OPL_REG_KSL_START,
  OPL_REG_KSL_END,
  OPL_REG_AD_START,
  OPL_REG_AD_END,
  OPL_REG_SR_START,
  OPL_REG_SR_END,
  OPL_REG_WAVE_START,
  OPL_REG_WAVE_END,
  OPL_REG_FNUM_LOW_START,
  OPL_REG_FNUM_LOW_END,
  OPL_REG_KEYON_START,
  OPL_REG_KEYON_END,
  OPL_REG_FB_START,
  OPL_REG_FB_END,
  OPL_KEYON_MASK,
  OPL_REG_RHYTHM,
  OPL_RHYTHM_MODE_MASK,
  CHIP_MID_C,
} from './constants';

/**
 * Create a default operator state
 */
function createDefaultOperator(): OPLOperatorState {
  return {
    am: false,
    vib: false,
    egt: false,
    ksr: false,
    mult: 0,
    ksl: 0,
    level: 63, // Max attenuation (silent)
    attack: 0,
    decay: 0,
    sustain: 0,
    release: 0,
    waveform: 0,
  };
}

/**
 * Create a default channel state
 */
function createDefaultChannel(): OPLChannelState {
  return {
    operators: [createDefaultOperator(), createDefaultOperator()],
    fnum: 0,
    block: 0,
    keyOn: false,
    feedback: 0,
    connection: 0,
  };
}

/**
 * Convert F-Num and Block to MIDI note number
 */
function fnumBlockToMidi(fnum: number, block: number): number {
  // Find the closest note by comparing with freqNums table
  // The freqNums are for block 1 (octave starting at note 12)
  // We need to find which note this fnum corresponds to

  let bestNote = 0;
  let bestDiff = Infinity;

  for (let noteInOctave = 0; noteInOctave < 12; noteInOctave++) {
    const refFnum = freqNums[noteInOctave];
    const diff = Math.abs(fnum - refFnum);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestNote = noteInOctave;
    }
  }

  // Calculate MIDI note: block determines octave
  // Block 0 = octave 0 (notes 0-11), Block 1 = octave 1 (notes 12-23), etc.
  // Add 12 because IMS player's noteOn() subtracts 12 (MID_C - CHIP_MID_C)
  const midiNote = block * 12 + bestNote + 12;

  return midiNote;
}

/**
 * Calculate volume from carrier level (0-63, inverted)
 */
function levelToVolume(level: number): number {
  // Always use maximum volume - actual volume is controlled by instrument level
  return 127;
}

/**
 * Get slot number from register offset
 */
function getSlotFromOffset(regOffset: number): number | null {
  // Register offset is the low 5 bits (0x00-0x15 pattern)
  const offset = regOffset % 32;

  // Valid offsets: 0-5, 8-13, 16-21
  if (offset >= 0 && offset <= 5) {
    return offset;
  } else if (offset >= 8 && offset <= 13) {
    return offset - 2; // 8->6, 9->7, ..., 13->11
  } else if (offset >= 16 && offset <= 21) {
    return offset - 4; // 16->12, 17->13, ..., 21->17
  }

  return null;
}

/**
 * OPL2 State Tracker
 */
export class OPLStateTracker {
  private channels: OPLChannelState[] = [];
  private instruments: ExtractedInstrument[] = [];
  private instrumentHashMap: Map<string, number> = new Map();
  private channelInstruments: number[] = []; // Current instrument index per channel
  private percussionMode: boolean = false;   // Rhythm/percussion mode flag

  constructor() {
    // Initialize 9 melodic channels
    for (let i = 0; i < 9; i++) {
      this.channels.push(createDefaultChannel());
      this.channelInstruments.push(-1);
    }
  }

  /**
   * Write to an OPL2 register and return any resulting event
   */
  writeRegister(reg: number, val: number): OPLEvent | null {
    // Rhythm mode register (0xBD)
    if (reg === OPL_REG_RHYTHM) {
      this.percussionMode = (val & OPL_RHYTHM_MODE_MASK) !== 0;
      return null;
    }

    // Operator parameter registers (per-slot)
    if (reg >= OPL_REG_AVEK_START && reg <= OPL_REG_AVEK_END) {
      return this.writeAVEK(reg, val);
    }
    if (reg >= OPL_REG_KSL_START && reg <= OPL_REG_KSL_END) {
      return this.writeKSL(reg, val);
    }
    if (reg >= OPL_REG_AD_START && reg <= OPL_REG_AD_END) {
      return this.writeAD(reg, val);
    }
    if (reg >= OPL_REG_SR_START && reg <= OPL_REG_SR_END) {
      return this.writeSR(reg, val);
    }
    if (reg >= OPL_REG_WAVE_START && reg <= OPL_REG_WAVE_END) {
      return this.writeWave(reg, val);
    }

    // Channel parameter registers
    if (reg >= OPL_REG_FNUM_LOW_START && reg <= OPL_REG_FNUM_LOW_END) {
      return this.writeFnumLow(reg, val);
    }
    if (reg >= OPL_REG_KEYON_START && reg <= OPL_REG_KEYON_END) {
      return this.writeKeyOn(reg, val);
    }
    if (reg >= OPL_REG_FB_START && reg <= OPL_REG_FB_END) {
      return this.writeFB(reg, val);
    }

    return null;
  }

  /**
   * Write AM/VIB/EG/KSR/MULT register (0x20-0x35)
   */
  private writeAVEK(reg: number, val: number): OPLEvent | null {
    const slot = getSlotFromOffset(reg - OPL_REG_AVEK_START);
    if (slot === null) return null;

    const channel = voiceMSlot[slot];
    const isCarrier = carrierSlot[slot] === 1;
    const opIndex = isCarrier ? 1 : 0;

    const op = this.channels[channel].operators[opIndex];
    op.am = (val & 0x80) !== 0;
    op.vib = (val & 0x40) !== 0;
    op.egt = (val & 0x20) !== 0;
    op.ksr = (val & 0x10) !== 0;
    op.mult = val & 0x0f;

    return null;
  }

  /**
   * Write KSL/Level register (0x40-0x55)
   */
  private writeKSL(reg: number, val: number): OPLEvent | null {
    const slot = getSlotFromOffset(reg - OPL_REG_KSL_START);
    if (slot === null) return null;

    const channel = voiceMSlot[slot];
    const isCarrier = carrierSlot[slot] === 1;
    const opIndex = isCarrier ? 1 : 0;

    const op = this.channels[channel].operators[opIndex];
    op.ksl = (val >> 6) & 0x03;
    op.level = val & 0x3f;

    return null;
  }

  /**
   * Write Attack/Decay register (0x60-0x75)
   */
  private writeAD(reg: number, val: number): OPLEvent | null {
    const slot = getSlotFromOffset(reg - OPL_REG_AD_START);
    if (slot === null) return null;

    const channel = voiceMSlot[slot];
    const isCarrier = carrierSlot[slot] === 1;
    const opIndex = isCarrier ? 1 : 0;

    const op = this.channels[channel].operators[opIndex];
    op.attack = (val >> 4) & 0x0f;
    op.decay = val & 0x0f;

    return null;
  }

  /**
   * Write Sustain/Release register (0x80-0x95)
   */
  private writeSR(reg: number, val: number): OPLEvent | null {
    const slot = getSlotFromOffset(reg - OPL_REG_SR_START);
    if (slot === null) return null;

    const channel = voiceMSlot[slot];
    const isCarrier = carrierSlot[slot] === 1;
    const opIndex = isCarrier ? 1 : 0;

    const op = this.channels[channel].operators[opIndex];
    op.sustain = (val >> 4) & 0x0f;
    op.release = val & 0x0f;

    return null;
  }

  /**
   * Write Waveform register (0xE0-0xF5)
   */
  private writeWave(reg: number, val: number): OPLEvent | null {
    const slot = getSlotFromOffset(reg - OPL_REG_WAVE_START);
    if (slot === null) return null;

    const channel = voiceMSlot[slot];
    const isCarrier = carrierSlot[slot] === 1;
    const opIndex = isCarrier ? 1 : 0;

    const op = this.channels[channel].operators[opIndex];
    op.waveform = val & 0x03;

    return null;
  }

  /**
   * Write F-Num low 8 bits (0xA0-0xA8)
   */
  private writeFnumLow(reg: number, val: number): OPLEvent | null {
    const channel = reg - OPL_REG_FNUM_LOW_START;
    if (channel < 0 || channel >= 9) return null;

    // Store low 8 bits, keep high 2 bits
    this.channels[channel].fnum = (this.channels[channel].fnum & 0x300) | val;

    return null;
  }

  /**
   * Write Key-On/Block/F-Num high register (0xB0-0xB8)
   */
  private writeKeyOn(reg: number, val: number): OPLEvent | null {
    const channel = reg - OPL_REG_KEYON_START;
    if (channel < 0 || channel >= 9) return null;

    const ch = this.channels[channel];
    const prevKeyOn = ch.keyOn;

    // Update state
    ch.keyOn = (val & OPL_KEYON_MASK) !== 0;
    ch.block = (val >> 2) & 0x07;
    ch.fnum = (ch.fnum & 0xff) | ((val & 0x03) << 8);

    // Detect key-on transition
    if (ch.keyOn && !prevKeyOn) {
      // Note on - extract instrument and create event
      const instrumentIndex = this.extractInstrument(channel);
      const note = fnumBlockToMidi(ch.fnum, ch.block);
      const volume = levelToVolume(ch.operators[1].level); // Carrier level

      // Check if instrument changed
      let event: OPLEvent | null = null;
      if (this.channelInstruments[channel] !== instrumentIndex) {
        this.channelInstruments[channel] = instrumentIndex;
        event = {
          type: 'instrumentChange',
          channel,
          instrumentIndex,
        };
      }

      // Return note on event (instrument change will be handled separately)
      return {
        type: 'noteOn',
        channel,
        note,
        volume,
        instrumentIndex,
      };
    } else if (!ch.keyOn && prevKeyOn) {
      // Note off
      const note = fnumBlockToMidi(ch.fnum, ch.block);
      return {
        type: 'noteOff',
        channel,
        note,
      };
    }

    return null;
  }

  /**
   * Write Feedback/Connection register (0xC0-0xC8)
   */
  private writeFB(reg: number, val: number): OPLEvent | null {
    const channel = reg - OPL_REG_FB_START;
    if (channel < 0 || channel >= 9) return null;

    this.channels[channel].feedback = (val >> 1) & 0x07;
    this.channels[channel].connection = val & 0x01;

    return null;
  }

  /**
   * Extract instrument parameters for a channel and return instrument index
   */
  private extractInstrument(channel: number): number {
    const ch = this.channels[channel];
    const params = this.operatorsToBnkParams(ch);
    const hash = this.hashParams(params);

    // Check if instrument already exists
    const existing = this.instrumentHashMap.get(hash);
    if (existing !== undefined) {
      return existing;
    }

    // Create new instrument
    const id = this.instruments.length;
    const name = `inst_${id.toString().padStart(2, '0')}`;

    this.instruments.push({
      id,
      name,
      params,
      hash,
    });
    this.instrumentHashMap.set(hash, id);

    return id;
  }

  /**
   * Convert operator states to 28-byte BNK format
   *
   * BNK format expects:
   * - bytes 0-12: operator 0 params (13 bytes, without waveform)
   * - bytes 13-25: operator 1 params (13 bytes, without waveform)
   * - byte 26: op0 waveform
   * - byte 27: op1 waveform
   */
  private operatorsToBnkParams(ch: OPLChannelState): number[] {
    const params: number[] = [];
    const [op0, op1] = ch.operators;

    // Operator 0 (modulator) - 13 parameters (without waveform)
    params.push(op0.ksl);           // 0: prmKsl
    params.push(op0.mult);          // 1: prmMulti
    params.push(ch.feedback);       // 2: prmFeedBack
    params.push(op0.attack);        // 3: prmAttack
    params.push(op0.sustain);       // 4: prmSustain
    params.push(op0.egt ? 1 : 0);   // 5: prmStaining
    params.push(op0.decay);         // 6: prmDecay
    params.push(op0.release);       // 7: prmRelease
    params.push(op0.level);         // 8: prmLevel
    params.push(op0.am ? 1 : 0);    // 9: prmAm
    params.push(op0.vib ? 1 : 0);   // 10: prmVib
    params.push(op0.ksr ? 1 : 0);   // 11: prmKsr
    // prmFm is inverted: OPL connection=0 (FM) → prmFm=1, connection=1 (AM) → prmFm=0
    params.push(ch.connection ? 0 : 1);  // 12: prmFm

    // Operator 1 (carrier) - 13 parameters (without waveform)
    params.push(op1.ksl);           // 13: prmKsl
    params.push(op1.mult);          // 14: prmMulti
    params.push(0);                 // 15: prmFeedBack (not used for carrier)
    params.push(op1.attack);        // 16: prmAttack
    params.push(op1.sustain);       // 17: prmSustain
    params.push(op1.egt ? 1 : 0);   // 18: prmStaining
    params.push(op1.decay);         // 19: prmDecay
    params.push(op1.release);       // 20: prmRelease
    params.push(op1.level);         // 21: prmLevel
    params.push(op1.am ? 1 : 0);    // 22: prmAm
    params.push(op1.vib ? 1 : 0);   // 23: prmVib
    params.push(op1.ksr ? 1 : 0);   // 24: prmKsr
    params.push(0);                 // 25: prmFm (not used for carrier)

    // Waveforms at the end
    params.push(op0.waveform);      // 26: op0 waveform
    params.push(op1.waveform);      // 27: op1 waveform

    return params;
  }

  /**
   * Create hash of params for deduplication
   */
  private hashParams(params: number[]): string {
    return params.join(',');
  }

  /**
   * Get all extracted instruments
   */
  getInstruments(): ExtractedInstrument[] {
    return this.instruments;
  }

  /**
   * Get percussion mode flag
   */
  isPercussionMode(): boolean {
    return this.percussionMode;
  }

  /**
   * Get current instrument index for a channel
   */
  getChannelInstrument(channel: number): number {
    return this.channelInstruments[channel];
  }

  /**
   * Check if a note is currently playing on a channel
   */
  isKeyOn(channel: number): boolean {
    return this.channels[channel].keyOn;
  }

  /**
   * Get the current note for a channel
   */
  getCurrentNote(channel: number): number {
    const ch = this.channels[channel];
    return fnumBlockToMidi(ch.fnum, ch.block);
  }

  /**
   * Get the current volume for a channel (from carrier level)
   */
  getCurrentVolume(channel: number): number {
    return levelToVolume(this.channels[channel].operators[1].level);
  }
}
