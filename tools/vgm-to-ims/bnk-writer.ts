/**
 * bnk-writer.ts - BNK (Instrument Bank) file writer
 *
 * BNK file format:
 * - Header (20 bytes)
 * - Instrument list (12 bytes per instrument)
 * - Instrument data (30 bytes per instrument)
 */

import type { ExtractedInstrument } from './types';
import {
  BNK_SIGNATURE,
  BNK_HEADER_SIZE,
  BNK_LIST_ENTRY_SIZE,
  BNK_DATA_ENTRY_SIZE,
  BNK_INSTRUMENT_NAME_SIZE,
} from './constants';

export class BNKWriter {
  private instruments: ExtractedInstrument[] = [];

  /**
   * Add an instrument
   */
  addInstrument(instrument: ExtractedInstrument): void {
    this.instruments.push(instrument);
  }

  /**
   * Add multiple instruments
   */
  addInstruments(instruments: ExtractedInstrument[]): void {
    this.instruments.push(...instruments);
  }

  /**
   * Write BNK file to Uint8Array
   */
  write(): Uint8Array {
    const insCount = this.instruments.length;
    const listSize = insCount * BNK_LIST_ENTRY_SIZE;
    const dataSize = insCount * BNK_DATA_ENTRY_SIZE;
    const totalSize = BNK_HEADER_SIZE + listSize + dataSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // ========================================================================
    // Header (20 bytes)
    // ========================================================================

    // Offset 0-1: version (uint16)
    view.setUint16(0, 1, true);

    // Offset 2-7: signature "ADLIB-" (6 bytes)
    for (let i = 0; i < BNK_SIGNATURE.length; i++) {
      bytes[2 + i] = BNK_SIGNATURE.charCodeAt(i);
    }

    // Offset 8-9: insMaxNum (uint16)
    view.setUint16(8, insCount, true);

    // Offset 10-11: padding (uint16)
    view.setUint16(10, 0, true);

    // Offset 12-15: insListOff (uint32)
    view.setUint32(12, BNK_HEADER_SIZE, true);

    // Offset 16-19: insDataOff (uint32)
    view.setUint32(16, BNK_HEADER_SIZE + listSize, true);

    // ========================================================================
    // Instrument List (12 bytes each)
    // ========================================================================

    const listOffset = BNK_HEADER_SIZE;
    for (let i = 0; i < insCount; i++) {
      const inst = this.instruments[i];
      const entryOffset = listOffset + i * BNK_LIST_ENTRY_SIZE;

      // Offset 0-1: insIndex (uint16)
      view.setUint16(entryOffset, i, true);

      // Offset 2: flag (uint8) - 0x01 for used
      bytes[entryOffset + 2] = 0x01;

      // Offset 3-11: name (9 bytes, null-terminated)
      const nameBytes = this.stringToBytes(inst.name, BNK_INSTRUMENT_NAME_SIZE);
      for (let j = 0; j < BNK_INSTRUMENT_NAME_SIZE; j++) {
        bytes[entryOffset + 3 + j] = nameBytes[j];
      }
    }

    // ========================================================================
    // Instrument Data (30 bytes each)
    // ========================================================================

    const dataOffset = BNK_HEADER_SIZE + listSize;
    for (let i = 0; i < insCount; i++) {
      const inst = this.instruments[i];
      const entryOffset = dataOffset + i * BNK_DATA_ENTRY_SIZE;

      // Offset 0: percussion flag (uint8)
      bytes[entryOffset] = 0;

      // Offset 1: voiceNumber (uint8)
      bytes[entryOffset + 1] = i;

      // Offset 2-29: params (28 bytes)
      for (let j = 0; j < 28; j++) {
        bytes[entryOffset + 2 + j] = inst.params[j] ?? 0;
      }
    }

    return bytes;
  }

  /**
   * Convert string to fixed-length byte array
   */
  private stringToBytes(str: string, length: number): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < length; i++) {
      if (i < str.length) {
        bytes.push(str.charCodeAt(i));
      } else {
        bytes.push(0); // Null padding
      }
    }
    return bytes;
  }

  /**
   * Get instrument count
   */
  getInstrumentCount(): number {
    return this.instruments.length;
  }

  /**
   * Get instrument names
   */
  getInstrumentNames(): string[] {
    return this.instruments.map(inst => inst.name);
  }
}
