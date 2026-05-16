/**
 * queue-stream.ts
 *
 * @ain1084/audio-worklet-stream의 ManualBuffer API를 SAB 없이 재구현한 모듈.
 * 메인 스레드와 AudioWorklet 간의 통신은 transferable Float32Array 청크로 처리.
 * COOP/COEP 헤더 없이도 작동.
 */

const PROCESSOR_NAME = 'audio-queue-processor';
const PROCESSOR_URL = '/audio-queue-processor.js';
const DEFAULT_CHUNK_FRAMES = 4096; // ~93ms at 44.1kHz

export interface WriteSegment {
  readonly frameCount: number;
  set(frameIdx: number, channelIdx: number, value: number): void;
}

export interface ManualBufferOptions {
  channelCount: number;
  frameCount: number; // 목표 총 버퍼링 크기 (chunk 풀 용량으로 환산)
  chunkFrames?: number;
}

const moduleLoadedContexts = new WeakSet<BaseAudioContext>();

async function ensureModule(context: BaseAudioContext): Promise<void> {
  if (moduleLoadedContexts.has(context)) return;
  if (!context.audioWorklet || typeof context.audioWorklet.addModule !== 'function') {
    const isSecure = typeof window !== 'undefined' && window.isSecureContext;
    const hint = isSecure
      ? '최신 Chrome/Edge/Firefox 또는 iOS 14.5 이상 Safari를 사용해주세요.'
      : 'HTTPS 또는 localhost에서만 작동합니다. (현재 페이지가 secure context가 아닙니다)';
    throw new Error('AudioWorklet을 사용할 수 없습니다. ' + hint);
  }
  await context.audioWorklet.addModule(PROCESSOR_URL);
  moduleLoadedContexts.add(context);
}

export class StreamNodeFactory {
  private constructor(private readonly context: AudioContext) {}

  static async create(context: AudioContext): Promise<StreamNodeFactory> {
    await ensureModule(context);
    return new StreamNodeFactory(context);
  }

  async createManualBufferNode(
    options: ManualBufferOptions
  ): Promise<[OutputQueueNode, QueueWriter]> {
    const { channelCount, frameCount } = options;
    const chunkFrames = options.chunkFrames ?? DEFAULT_CHUNK_FRAMES;
    const maxChunks = Math.max(2, Math.ceil(frameCount / chunkFrames));

    const node = new AudioWorkletNode(this.context, PROCESSOR_NAME, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [channelCount],
    });

    const outputNode = new OutputQueueNode(node);
    const writer = new QueueWriter(node, channelCount, chunkFrames, maxChunks);
    outputNode._bindWriter(writer);
    return [outputNode, writer];
  }
}

export class OutputQueueNode {
  totalReadFrames = 0;
  private writer: QueueWriter | null = null;
  private stopResolve: (() => void) | null = null;

  constructor(private readonly node: AudioWorkletNode) {
    node.port.onmessage = (e) => this.handleMessage(e.data);
  }

  /** @internal */
  _bindWriter(writer: QueueWriter): void {
    this.writer = writer;
  }

  private handleMessage(msg: WorkletToMainMessage): void {
    switch (msg.type) {
      case 'progress':
        this.totalReadFrames = msg.totalRead;
        break;
      case 'recycle':
        this.writer?._acceptRecycle(msg.channels);
        break;
      case 'stopped':
        if (this.stopResolve) {
          this.stopResolve();
          this.stopResolve = null;
        }
        break;
    }
  }

  start(): void {
    this.node.port.postMessage({ type: 'start' });
  }

  stop(framePosition?: number | bigint): Promise<void> {
    return new Promise((resolve) => {
      // 이전 stop 약속이 남아있으면 즉시 해소
      if (this.stopResolve) this.stopResolve();
      this.stopResolve = resolve;

      const frame =
        framePosition === undefined
          ? null
          : typeof framePosition === 'bigint'
            ? Number(framePosition)
            : framePosition;
      this.node.port.postMessage({ type: 'stop', frame });

      // 안전 타임아웃 (worklet이 suspended일 경우 대비)
      setTimeout(() => {
        if (this.stopResolve === resolve) {
          this.stopResolve = null;
          resolve();
        }
      }, 5000);
    });
  }

  connect(destination: AudioNode): AudioNode;
  connect(destination: AudioParam): void;
  connect(destination: AudioNode | AudioParam): AudioNode | void {
    // AudioWorkletNode.connect 시그니처를 그대로 위임
    return (this.node.connect as (d: AudioNode | AudioParam) => AudioNode | void)(
      destination
    );
  }

  disconnect(): void {
    this.node.disconnect();
  }
}

export class QueueWriter {
  totalFrames = 0;
  private pool: Float32Array[][] = [];
  private inFlight = 0;
  private allocated = 0;

  constructor(
    private readonly node: AudioWorkletNode,
    private readonly channelCount: number,
    private readonly chunkFrames: number,
    private readonly maxChunks: number
  ) {}

  /** @internal */
  _acceptRecycle(channels: Float32Array[]): void {
    this.pool.push(channels);
    this.inFlight--;
  }

  private obtainChunk(): Float32Array[] | null {
    if (this.pool.length > 0) return this.pool.pop()!;
    if (this.allocated < this.maxChunks) {
      const channels: Float32Array[] = [];
      for (let i = 0; i < this.channelCount; i++) {
        channels.push(new Float32Array(this.chunkFrames));
      }
      this.allocated++;
      return channels;
    }
    return null;
  }

  write(callback: (segment: WriteSegment) => number): void {
    while (this.inFlight < this.maxChunks) {
      const channels = this.obtainChunk();
      if (!channels) break;

      const segment: WriteSegment = {
        frameCount: this.chunkFrames,
        set(frameIdx, channelIdx, value) {
          channels[channelIdx][frameIdx] = value;
        },
      };

      const framesWritten = callback(segment);
      if (framesWritten <= 0) {
        // 소비자에게 돌려주지 말고 풀로 환원
        this.pool.push(channels);
        break;
      }

      const transfer = channels.map((c) => c.buffer) as ArrayBuffer[];
      this.node.port.postMessage(
        { type: 'chunk', channels, length: framesWritten },
        transfer
      );
      this.totalFrames += framesWritten;
      this.inFlight++;

      if (framesWritten < this.chunkFrames) {
        // 생산자가 데이터를 다 소진한 경우
        break;
      }
    }
  }
}

type WorkletToMainMessage =
  | { type: 'progress'; totalRead: number }
  | { type: 'recycle'; channels: Float32Array[] }
  | { type: 'stopped' };
