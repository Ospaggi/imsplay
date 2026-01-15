/**
 * AudioWorkletProcessor for AdPlug playback
 *
 * Uses a ring buffer to receive samples from the main thread
 * and outputs them with consistent timing.
 */

class AdPlugProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Ring buffer for audio samples (stereo interleaved)
    this.bufferSize = 32768; // Large buffer for stability
    this.buffer = new Float32Array(this.bufferSize * 2);
    this.writeIndex = 0;
    this.readIndex = 0;
    this.samplesAvailable = 0;

    // Receive samples from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'samples') {
        const samples = event.data.samples;
        const numSamples = samples.length / 2;

        // Write to ring buffer
        for (let i = 0; i < samples.length; i++) {
          this.buffer[this.writeIndex] = samples[i];
          this.writeIndex = (this.writeIndex + 1) % (this.bufferSize * 2);
        }
        this.samplesAvailable += numSamples;

        // Prevent overflow
        if (this.samplesAvailable > this.bufferSize) {
          this.samplesAvailable = this.bufferSize;
        }
      } else if (event.data.type === 'clear') {
        // Clear buffer
        this.writeIndex = 0;
        this.readIndex = 0;
        this.samplesAvailable = 0;
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
      if (this.samplesAvailable > 0) {
        outputL[i] = this.buffer[this.readIndex];
        outputR[i] = this.buffer[this.readIndex + 1];
        this.readIndex = (this.readIndex + 2) % (this.bufferSize * 2);
        this.samplesAvailable--;
      } else {
        // Buffer underrun - output silence
        outputL[i] = 0;
        outputR[i] = 0;
      }
    }

    // Request more samples if buffer is getting low
    if (this.samplesAvailable < this.bufferSize / 4) {
      this.port.postMessage({ type: 'needSamples', available: this.samplesAvailable });
    }

    return true;
  }
}

registerProcessor('adplug-processor', AdPlugProcessor);
