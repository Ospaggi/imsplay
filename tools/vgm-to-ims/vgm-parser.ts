/**
 * vgm-parser.ts - VGM file parser for YM3812/OPL2
 */

import type { VGMHeader, VGMCommand, VGMData } from './types';
import {
  VGM_CMD_YM3812_WRITE,
  VGM_CMD_WAIT_LONG,
  VGM_CMD_WAIT_NTSC,
  VGM_CMD_WAIT_PAL,
  VGM_CMD_END,
  VGM_WAIT_NTSC_SAMPLES,
  VGM_WAIT_PAL_SAMPLES,
  VGM_OFFSET_MAGIC,
  VGM_OFFSET_EOF,
  VGM_OFFSET_VERSION,
  VGM_OFFSET_GD3,
  VGM_OFFSET_TOTAL_SAMPLES,
  VGM_OFFSET_LOOP_OFFSET,
  VGM_OFFSET_LOOP_SAMPLES,
  VGM_OFFSET_DATA,
  VGM_OFFSET_YM3812_CLOCK,
} from './constants';

/**
 * Parse VGM file header
 */
function parseHeader(view: DataView): VGMHeader {
  // Read magic bytes
  const magic = String.fromCharCode(
    view.getUint8(VGM_OFFSET_MAGIC),
    view.getUint8(VGM_OFFSET_MAGIC + 1),
    view.getUint8(VGM_OFFSET_MAGIC + 2),
    view.getUint8(VGM_OFFSET_MAGIC + 3)
  );

  if (magic !== 'Vgm ') {
    throw new Error(`Invalid VGM magic: expected "Vgm ", got "${magic}"`);
  }

  const eofOffset = view.getUint32(VGM_OFFSET_EOF, true);
  const version = view.getUint32(VGM_OFFSET_VERSION, true);
  const gd3Offset = view.getUint32(VGM_OFFSET_GD3, true);
  const totalSamples = view.getUint32(VGM_OFFSET_TOTAL_SAMPLES, true);
  const loopOffset = view.getUint32(VGM_OFFSET_LOOP_OFFSET, true);
  const loopSamples = view.getUint32(VGM_OFFSET_LOOP_SAMPLES, true);

  // Read data offset (relative to 0x34)
  const dataOffsetRel = view.getUint32(VGM_OFFSET_DATA, true);
  // If 0, data starts at 0x40 (VGM 1.00); otherwise relative to 0x34
  const dataOffset = dataOffsetRel === 0 ? 0x40 : VGM_OFFSET_DATA + dataOffsetRel;

  // Read YM3812 clock (at 0x50, only in version 1.51+)
  let ym3812Clock = 0;
  if (view.byteLength > VGM_OFFSET_YM3812_CLOCK + 4) {
    ym3812Clock = view.getUint32(VGM_OFFSET_YM3812_CLOCK, true);
  }

  return {
    magic,
    eofOffset,
    version,
    gd3Offset,
    totalSamples,
    loopOffset,
    loopSamples,
    ym3812Clock,
    dataOffset,
  };
}

/**
 * Parse VGM command stream
 */
function parseCommands(view: DataView, startOffset: number): VGMCommand[] {
  const commands: VGMCommand[] = [];
  let offset = startOffset;
  let absoluteSample = 0;

  while (offset < view.byteLength) {
    const cmd = view.getUint8(offset);
    offset++;

    if (cmd === VGM_CMD_YM3812_WRITE) {
      // 0x5A aa dd - Write to YM3812 register
      const register = view.getUint8(offset);
      const value = view.getUint8(offset + 1);
      offset += 2;

      commands.push({
        type: 'write',
        register,
        value,
        absoluteSample,
      });
    } else if (cmd === VGM_CMD_WAIT_LONG) {
      // 0x61 nn nn - Wait n samples
      const samples = view.getUint16(offset, true);
      offset += 2;
      absoluteSample += samples;

      commands.push({
        type: 'wait',
        samples,
        absoluteSample,
      });
    } else if (cmd === VGM_CMD_WAIT_NTSC) {
      // 0x62 - Wait 735 samples (NTSC 1/60)
      absoluteSample += VGM_WAIT_NTSC_SAMPLES;

      commands.push({
        type: 'wait',
        samples: VGM_WAIT_NTSC_SAMPLES,
        absoluteSample,
      });
    } else if (cmd === VGM_CMD_WAIT_PAL) {
      // 0x63 - Wait 882 samples (PAL 1/50)
      absoluteSample += VGM_WAIT_PAL_SAMPLES;

      commands.push({
        type: 'wait',
        samples: VGM_WAIT_PAL_SAMPLES,
        absoluteSample,
      });
    } else if (cmd >= 0x70 && cmd <= 0x7f) {
      // 0x7n - Short wait: (n + 1) samples
      const samples = (cmd & 0x0f) + 1;
      absoluteSample += samples;

      commands.push({
        type: 'wait',
        samples,
        absoluteSample,
      });
    } else if (cmd === VGM_CMD_END) {
      // 0x66 - End of data
      commands.push({
        type: 'end',
        absoluteSample,
      });
      break;
    } else {
      // Unknown command - try to skip based on known patterns
      // Some VGM commands we don't support:
      // 0x4F dd - Game Gear PSG stereo
      // 0x50 dd - PSG write
      // 0x51-0x5F - Various chip writes (we only care about 0x5A)
      // 0x67 - Data block
      // etc.

      // For safety, we'll skip single-byte commands and warn
      if (cmd === 0x4f || cmd === 0x50) {
        offset += 1; // Skip 1 data byte
      } else if (cmd >= 0x51 && cmd <= 0x5f && cmd !== VGM_CMD_YM3812_WRITE) {
        offset += 2; // Skip 2 data bytes for other chip writes
      } else if (cmd === 0x67) {
        // Data block: 0x67 0x66 tt ss ss ss ss [data]
        offset += 2; // Skip 0x66 and type
        const blockSize = view.getUint32(offset, true);
        offset += 4 + blockSize;
      } else if (cmd >= 0x80 && cmd <= 0x8f) {
        // YM2612 DAC wait + write
        const samples = cmd & 0x0f;
        absoluteSample += samples;
      } else if (cmd === 0xe0) {
        // Seek to offset in data block
        offset += 4;
      }
      // Silently ignore other unknown commands
    }
  }

  return commands;
}

/**
 * Parse a VGM file buffer
 */
export function parseVGM(buffer: ArrayBuffer): VGMData {
  const view = new DataView(buffer);

  const header = parseHeader(view);

  // Check if this VGM has YM3812 data
  if (header.ym3812Clock === 0) {
    console.warn('Warning: VGM file does not specify YM3812 clock. Assuming it contains OPL2 data.');
  }

  const commands = parseCommands(view, header.dataOffset);

  return {
    header,
    commands,
  };
}
