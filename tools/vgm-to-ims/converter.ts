/**
 * converter.ts - Main VGM to IMS+BNK conversion logic
 */

import type { VGMData, VGMCommand, IMSEvent, ConverterOptions, ConversionResult } from './types';
import { parseVGM } from './vgm-parser';
import { OPLStateTracker } from './opl-state-tracker';
import { IMSWriter } from './ims-writer';
import { BNKWriter } from './bnk-writer';
import {
  VGM_SAMPLE_RATE,
  IMS_EVENT_NOTE_ON_COND,
  IMS_EVENT_INSTRUMENT,
} from './constants';

/**
 * Convert VGM samples to IMS ticks
 *
 * IMS timing: tickDelay = 60000 / (240 * tempo) ms
 * At tempo 120: tickDelay = 2.083ms, ticksPerSecond = 480
 * Formula: ticksPerSecond = 4 * tempo
 */
function samplesToTicks(samples: number, tempo: number): number {
  const ticksPerSecond = 4 * tempo;
  return Math.round(samples * ticksPerSecond / VGM_SAMPLE_RATE);
}

/**
 * VGM to IMS+BNK Converter
 */
export class VGMToIMSConverter {
  private tempo: number;
  private songName: string;

  constructor(options: ConverterOptions = {}) {
    this.tempo = options.tempo ?? 120;
    this.songName = options.songName ?? '';
  }

  /**
   * Convert VGM buffer to IMS+BNK
   */
  convert(vgmBuffer: ArrayBuffer): ConversionResult {
    // Parse VGM file
    const vgmData = parseVGM(vgmBuffer);

    // Create writers and state tracker
    const oplTracker = new OPLStateTracker();
    const imsWriter = new IMSWriter();
    const bnkWriter = new BNKWriter();

    // Configure IMS writer
    imsWriter.setSongName(this.songName);
    imsWriter.setTempo(this.tempo);

    // Process VGM commands
    const events = this.processCommands(vgmData, oplTracker);

    // Set drum mode based on what was detected in VGM
    imsWriter.setDrumMode(oplTracker.isPercussionMode() ? 1 : 0);

    // Add events to IMS writer
    imsWriter.addEvents(events);

    // Get extracted instruments and add to BNK writer
    const instruments = oplTracker.getInstruments();
    bnkWriter.addInstruments(instruments);

    // Set instrument names in IMS
    imsWriter.setInstruments(bnkWriter.getInstrumentNames());

    // Generate output files
    return {
      ims: imsWriter.write(),
      bnk: bnkWriter.write(),
      instrumentCount: bnkWriter.getInstrumentCount(),
      eventCount: imsWriter.getEventCount(),
    };
  }

  /**
   * Process VGM commands and generate IMS events
   */
  private processCommands(vgmData: VGMData, oplTracker: OPLStateTracker): IMSEvent[] {
    const events: IMSEvent[] = [];
    const channelInstruments: number[] = [-1, -1, -1, -1, -1, -1, -1, -1, -1];
    let currentSample = 0;
    let orderIndex = 0;  // For stable sorting

    for (const cmd of vgmData.commands) {
      if (cmd.type === 'write') {
        // Process register write
        const oplEvent = oplTracker.writeRegister(cmd.register!, cmd.value!);

        if (oplEvent) {
          const tick = samplesToTicks(currentSample, this.tempo);

          if (oplEvent.type === 'noteOn') {
            // Check if instrument changed
            if (oplEvent.instrumentIndex !== undefined &&
                channelInstruments[oplEvent.channel] !== oplEvent.instrumentIndex) {
              channelInstruments[oplEvent.channel] = oplEvent.instrumentIndex;

              // Add instrument change event (must come before note on)
              events.push({
                type: IMS_EVENT_INSTRUMENT as 0xc0,
                channel: oplEvent.channel,
                data: [oplEvent.instrumentIndex],
                absoluteTick: tick,
                orderIndex: orderIndex++,
              });
            }

            // Add note on event
            events.push({
              type: IMS_EVENT_NOTE_ON_COND as 0x90,
              channel: oplEvent.channel,
              data: [oplEvent.note ?? 60, oplEvent.volume ?? 127],
              absoluteTick: tick,
              orderIndex: orderIndex++,
            });
          } else if (oplEvent.type === 'noteOff') {
            // Add note off event (note on with volume 0)
            events.push({
              type: IMS_EVENT_NOTE_ON_COND as 0x90,
              channel: oplEvent.channel,
              data: [oplEvent.note ?? 60, 0],
              absoluteTick: tick,
              orderIndex: orderIndex++,
            });
          }
        }
      } else if (cmd.type === 'wait') {
        currentSample = cmd.absoluteSample;
      } else if (cmd.type === 'end') {
        break;
      }
    }

    return events;
  }
}

/**
 * Convenience function to convert VGM to IMS+BNK
 */
export function convertVGMToIMS(
  vgmBuffer: ArrayBuffer,
  options?: ConverterOptions
): ConversionResult {
  const converter = new VGMToIMSConverter(options);
  return converter.convert(vgmBuffer);
}
