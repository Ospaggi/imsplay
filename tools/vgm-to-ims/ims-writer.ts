/**
 * ims-writer.ts - IMS (Interactive Music System) file writer
 *
 * IMS file format:
 * - Header (71 bytes)
 * - Music data (event stream, 32KB paging)
 * - Footer (separator + instrument count + instrument names)
 */

import type { IMSEvent, IMSEventType } from './types';
import {
  IMS_EVENT_NOTE_ON_ALWAYS,
  IMS_EVENT_NOTE_ON_COND,
  IMS_EVENT_VOLUME,
  IMS_EVENT_INSTRUMENT,
  IMS_EVENT_PITCH_BEND,
  IMS_EVENT_TEMPO,
  IMS_DELTA_240,
  IMS_OFFSET_SONGNAME,
  IMS_OFFSET_BYTESIZE,
  IMS_OFFSET_DMODE,
  IMS_OFFSET_TEMPO,
  IMS_OFFSET_MUSICDATA,
} from './constants';

export class IMSWriter {
  private events: IMSEvent[] = [];
  private instrumentNames: string[] = [];
  private songName: string = '';
  private basicTempo: number = 120;
  private dMode: number = 0; // 0 = melodic (9 channels)

  /**
   * Set song name
   */
  setSongName(name: string): void {
    this.songName = name.substring(0, 30); // Max 30 chars
  }

  /**
   * Set base tempo
   */
  setTempo(tempo: number): void {
    this.basicTempo = Math.max(1, Math.min(255, tempo));
  }

  /**
   * Set drum mode (0 = melodic, 1 = percussion)
   */
  setDrumMode(mode: number): void {
    this.dMode = mode;
  }

  /**
   * Set instrument names
   */
  setInstruments(names: string[]): void {
    this.instrumentNames = names.map(name => name.substring(0, 8)); // Max 8 chars + null
  }

  /**
   * Add an event
   */
  addEvent(event: IMSEvent): void {
    this.events.push(event);
  }

  /**
   * Add multiple events
   */
  addEvents(events: IMSEvent[]): void {
    this.events.push(...events);
  }

  /**
   * Write IMS file to Uint8Array
   */
  write(): Uint8Array {
    // Sort events by absolute tick, then by order index (for stable sorting)
    // This ensures instrument change comes before note on at the same tick
    this.events.sort((a, b) => {
      if (a.absoluteTick !== b.absoluteTick) {
        return a.absoluteTick - b.absoluteTick;
      }
      // Same tick: use orderIndex for stable sorting
      return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    });

    // Encode music data
    const musicData = this.encodeMusicData();

    // Calculate total size
    const headerSize = IMS_OFFSET_MUSICDATA;
    const footerSize = 1 + 2 + this.instrumentNames.length * 9; // separator + insNum + names
    const totalSize = headerSize + musicData.length + footerSize;

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);

    // ========================================================================
    // Header (71 bytes)
    // ========================================================================

    // Offset 0-5: Unknown header bytes (zeros)
    // Already zero-initialized

    // Offset 6-35: Song name (30 bytes)
    // For simplicity, we write ASCII. Original IMS uses Johab encoding.
    for (let i = 0; i < 30; i++) {
      if (i < this.songName.length) {
        bytes[IMS_OFFSET_SONGNAME + i] = this.songName.charCodeAt(i);
      } else {
        bytes[IMS_OFFSET_SONGNAME + i] = 0;
      }
    }

    // Offset 36-41: Unknown (zeros)
    // Already zero-initialized

    // Offset 42-45: byteSize (uint32) - music data size
    view.setUint32(IMS_OFFSET_BYTESIZE, musicData.length, true);

    // Offset 46-57: Unknown (zeros)
    // Already zero-initialized

    // Offset 58: dMode (uint8)
    bytes[IMS_OFFSET_DMODE] = this.dMode;

    // Offset 59: Unknown (zero)
    // Already zero-initialized

    // Offset 60-61: basicTempo (uint16)
    view.setUint16(IMS_OFFSET_TEMPO, this.basicTempo, true);

    // Offset 62-70: Unknown (zeros)
    // Already zero-initialized

    // ========================================================================
    // Music Data (starting at offset 71)
    // ========================================================================

    for (let i = 0; i < musicData.length; i++) {
      bytes[IMS_OFFSET_MUSICDATA + i] = musicData[i];
    }

    // ========================================================================
    // Footer
    // ========================================================================

    const footerOffset = IMS_OFFSET_MUSICDATA + musicData.length;

    // Separator (1 byte)
    bytes[footerOffset] = 0x00;

    // Instrument count (2 bytes, uint16)
    view.setUint16(footerOffset + 1, this.instrumentNames.length, true);

    // Instrument names (9 bytes each)
    for (let i = 0; i < this.instrumentNames.length; i++) {
      const name = this.instrumentNames[i];
      const nameOffset = footerOffset + 3 + i * 9;
      for (let j = 0; j < 9; j++) {
        if (j < name.length) {
          bytes[nameOffset + j] = name.charCodeAt(j);
        } else {
          bytes[nameOffset + j] = 0;
        }
      }
    }

    return bytes;
  }

  /**
   * Encode music data (event stream with delta times)
   *
   * IMS format: [event1][delta1][event2][delta2]...
   * The delta time comes AFTER the event, indicating the delay until the next event.
   */
  private encodeMusicData(): Uint8Array {
    const data: number[] = [];
    let lastTick = 0;
    let runningStatus = -1;

    for (let i = 0; i < this.events.length; i++) {
      const event = this.events[i];

      // Encode event FIRST
      const eventBytes = this.encodeEvent(event, runningStatus);
      data.push(...eventBytes);

      // Update running status
      runningStatus = event.type | event.channel;

      // Encode delta time AFTER the event
      // Delta is the time until the NEXT event
      const nextTick = (i + 1 < this.events.length) ? this.events[i + 1].absoluteTick : event.absoluteTick;
      const deltaTicks = nextTick - event.absoluteTick;
      const deltaBytes = this.encodeDeltaTime(deltaTicks);
      data.push(...deltaBytes);
    }

    // Add loop marker at the end
    data.push(0xfc);

    return new Uint8Array(data);
  }

  /**
   * Encode delta time
   *
   * Delta time encoding:
   * - 0x00: No delay (0 ticks)
   * - 0x01-0xF7: Direct delay value (1-247 ticks)
   * - 0xF8: Add 240 ticks and continue reading
   * - 0xFC: Loop marker (handled separately)
   */
  private encodeDeltaTime(ticks: number): number[] {
    const bytes: number[] = [];

    // Handle 0 delay
    if (ticks <= 0) {
      bytes.push(0x00);
      return bytes;
    }

    // Encode 240-tick chunks
    while (ticks >= 240) {
      bytes.push(IMS_DELTA_240);
      ticks -= 240;
    }

    // Encode remaining ticks (0-247, but we keep it under 0xF8)
    // Make sure we don't conflict with special codes (0xF8, 0xFC)
    if (ticks >= 0xf8) {
      bytes.push(0xf7); // Max direct value (247)
      ticks -= 0xf7;
    }

    // Write remaining ticks (including 0 after 0xF8)
    bytes.push(ticks);

    return bytes;
  }

  /**
   * Encode a single event
   */
  private encodeEvent(event: IMSEvent, runningStatus: number): number[] {
    const bytes: number[] = [];
    const statusByte = event.type | event.channel;

    // Use running status optimization (skip status byte if same as previous)
    if (statusByte !== runningStatus) {
      bytes.push(statusByte);
    }

    // Encode event data
    switch (event.type) {
      case IMS_EVENT_NOTE_ON_ALWAYS:
      case IMS_EVENT_NOTE_ON_COND:
        // pitch, volume
        bytes.push(event.data[0] ?? 0); // pitch
        bytes.push(event.data[1] ?? 0); // volume
        break;

      case IMS_EVENT_VOLUME:
        // volume
        bytes.push(event.data[0] ?? 0);
        break;

      case IMS_EVENT_INSTRUMENT:
        // instrument index
        bytes.push(event.data[0] ?? 0);
        break;

      case IMS_EVENT_PITCH_BEND:
        // LSB, MSB
        bytes.push(event.data[0] ?? 0);
        bytes.push(event.data[1] ?? 0);
        break;

      case IMS_EVENT_TEMPO:
        // skip2, data1, data2, skip1
        bytes.push(0); // skip
        bytes.push(0); // skip
        bytes.push(event.data[0] ?? 0); // data1
        bytes.push(event.data[1] ?? 0); // data2
        bytes.push(0); // skip
        break;
    }

    return bytes;
  }

  /**
   * Get event count
   */
  getEventCount(): number {
    return this.events.length;
  }
}
