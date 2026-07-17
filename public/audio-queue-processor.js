/**
 * audio-queue-processor.js
 *
 * postMessage 기반 청크 큐 AudioWorklet processor.
 * 메인 스레드가 transferable Float32Array 청크를 보내면 큐에 쌓고
 * process()에서 순차적으로 출력 버퍼에 복사한 뒤 빈 청크를 메인으로 돌려줌.
 *
 * 메시지 프로토콜:
 *   main → worklet:
 *     { type: 'chunk', channels: Float32Array[], length: number }
 *     { type: 'start' }
 *     { type: 'stop', frame: number | null }   // frame=null이면 즉시 정지
 *     { type: 'reset' }
 *   worklet → main:
 *     { type: 'recycle', channels: Float32Array[] }
 *     { type: 'progress', totalRead: number }
 *     { type: 'stopped' }
 */

const PROGRESS_INTERVAL_QUANTA = 32; // ~93ms at 44.1kHz / 128-frame quantum

class AudioQueueProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.queue = [];           // { channels: Float32Array[], length: number }
    this.current = null;
    this.currentOffset = 0;
    this.playing = false;
    this.totalRead = 0;
    this.stopAtFrame = null;
    this.quantumCounter = 0;
    this.stopped = false;

    this.port.onmessage = (e) => {
      const msg = e.data;
      switch (msg.type) {
        case 'chunk':
          this.queue.push({ channels: msg.channels, length: msg.length });
          break;
        case 'start':
          this.playing = true;
          this.stopped = false;
          this.stopAtFrame = null;
          break;
        case 'stop':
          if (msg.frame === null || msg.frame === undefined) {
            this.playing = false;
            this.recycleAll();
            this.stopAtFrame = null;
            this.emitStopped();
          } else {
            this.stopAtFrame = msg.frame;
          }
          break;
        case 'reset':
          this.playing = false;
          this.recycleAll();
          this.totalRead = 0;
          this.stopAtFrame = null;
          this.stopped = false;
          break;
      }
    };
  }

  recycleAll() {
    if (this.current) {
      this.recycle(this.current.channels);
      this.current = null;
      this.currentOffset = 0;
    }
    while (this.queue.length > 0) {
      const c = this.queue.shift();
      this.recycle(c.channels);
    }
  }

  recycle(channels) {
    const transfer = channels.map((c) => c.buffer);
    this.port.postMessage({ type: 'recycle', channels }, transfer);
  }

  emitStopped() {
    if (this.stopped) return;
    this.stopped = true;
    this.port.postMessage({ type: 'stopped' });
  }

  process(_inputs, outputs) {
    const out = outputs[0];
    if (!out || out.length === 0) return true;
    const frameCount = out[0].length;
    const channelCount = out.length;

    if (!this.playing) {
      return true; // outputs are zero-filled by default
    }

    let written = 0;
    while (written < frameCount) {
      // stopAtFrame 도달 체크
      if (this.stopAtFrame !== null && this.totalRead >= this.stopAtFrame) {
        this.playing = false;
        this.recycleAll();
        this.emitStopped();
        break;
      }

      if (!this.current) {
        if (this.queue.length === 0) {
          break; // underrun → 남은 프레임은 무음
        }
        this.current = this.queue.shift();
        this.currentOffset = 0;
      }

      const remaining = this.current.length - this.currentOffset;
      const toCopy = Math.min(remaining, frameCount - written);
      const srcChannels = this.current.channels;
      const srcChannelCount = srcChannels.length;
      for (let ch = 0; ch < channelCount; ch++) {
        const src = srcChannels[ch < srcChannelCount ? ch : srcChannelCount - 1];
        const dst = out[ch];
        const srcOff = this.currentOffset;
        const dstOff = written;
        for (let i = 0; i < toCopy; i++) {
          dst[dstOff + i] = src[srcOff + i];
        }
      }
      this.currentOffset += toCopy;
      written += toCopy;
      this.totalRead += toCopy;

      if (this.currentOffset >= this.current.length) {
        this.recycle(this.current.channels);
        this.current = null;
      }
    }

    // 진척률 주기 보고
    this.quantumCounter++;
    if (this.quantumCounter >= PROGRESS_INTERVAL_QUANTA) {
      this.quantumCounter = 0;
      this.port.postMessage({ type: 'progress', totalRead: this.totalRead });
    }

    return true;
  }
}

registerProcessor('audio-queue-processor', AudioQueueProcessor);
