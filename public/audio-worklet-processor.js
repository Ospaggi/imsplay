/**
 * AudioWorkletProcessor for AdPlug playback
 *
 * Uses a queue-based buffer to receive samples from the main thread
 * and outputs them with consistent timing.
 */

class AdPlugProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // 샘플 큐 (Float32Array 배열)
    this.sampleQueue = [];
    this.currentBuffer = null;
    this.currentOffset = 0;
    this.totalSamplesOutput = 0;  // 총 출력 샘플 수 (ISS 동기화용)
    this.lastPositionUpdate = 0;  // 마지막 위치 업데이트 시점

    // Receive samples from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'samples') {
        // 큐에 추가 (복사해서 저장)
        const samples = new Float32Array(event.data.samples);
        this.sampleQueue.push(samples);
      } else if (event.data.type === 'clear') {
        // Clear buffer
        this.sampleQueue = [];
        this.currentBuffer = null;
        this.currentOffset = 0;
        this.totalSamplesOutput = 0;
        this.lastPositionUpdate = 0;
        // 클리어 완료 알림
        this.port.postMessage({ type: 'cleared' });
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    const outputL = output[0];
    const outputR = output[1];

    if (!outputL || !outputR) {
      return true;
    }

    const frameCount = outputL.length;

    for (let i = 0; i < frameCount; i++) {
      // 현재 버퍼가 없거나 다 읽었으면 다음 버퍼 가져오기
      if (!this.currentBuffer || this.currentOffset >= this.currentBuffer.length) {
        if (this.sampleQueue.length > 0) {
          this.currentBuffer = this.sampleQueue.shift();
          this.currentOffset = 0;
        } else {
          // 버퍼 없음 - 무음 출력
          outputL[i] = 0;
          outputR[i] = 0;
          continue;
        }
      }

      // 스테레오 샘플 출력
      outputL[i] = this.currentBuffer[this.currentOffset];
      outputR[i] = this.currentBuffer[this.currentOffset + 1];
      this.currentOffset += 2;
      this.totalSamplesOutput++;  // 프레임 카운트 (샘플 쌍)
    }

    // 큐가 거의 비었으면 더 요청
    const totalQueuedFrames = this.sampleQueue.reduce((sum, buf) => sum + buf.length / 2, 0);
    const currentRemaining = this.currentBuffer ? (this.currentBuffer.length - this.currentOffset) / 2 : 0;
    const totalFrames = totalQueuedFrames + currentRemaining;

    // 16384 프레임 미만이면 추가 요청 (~370ms at 44100Hz)
    if (totalFrames < 16384) {
      this.port.postMessage({
        type: 'needSamples',
        frames: totalFrames,
        samplesOutput: this.totalSamplesOutput
      });
      this.lastPositionUpdate = this.totalSamplesOutput;
    }

    // 주기적 위치 업데이트 (~30fps = 매 1470 프레임, ~33ms at 44100Hz)
    // needSamples와 별개로 UI가 항상 최신 위치를 받도록 함
    if (this.totalSamplesOutput - this.lastPositionUpdate >= 1470) {
      this.port.postMessage({
        type: 'position',
        samplesOutput: this.totalSamplesOutput
      });
      this.lastPositionUpdate = this.totalSamplesOutput;
    }

    return true;
  }
}

registerProcessor('adplug-processor', AdPlugProcessor);
