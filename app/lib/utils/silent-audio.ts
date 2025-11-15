/**
 * silent-audio.ts - 무음 오디오 생성 유틸리티
 *
 * Media Session API 활성화를 위한 무음 WAV 파일 생성
 * Firefox는 완전 무음을 거부하므로 극미량 노이즈 포함
 */

/**
 * 무음(또는 극미량 노이즈) WAV 파일을 data URL로 생성
 * @param durationSeconds 오디오 길이 (초)
 * @returns data URL (audio/wav)
 */
export function generateSilentAudioDataURL(durationSeconds: number = 10): string {
  const sampleRate = 44100;
  const numChannels = 1;
  const numSamples = sampleRate * durationSeconds;

  // WAV file header (44 bytes) + PCM data
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true); // file size - 8
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true); // data size

  // PCM samples - Firefox용 극미량 노이즈
  // (완전 무음은 Firefox가 거부함)
  const samples = new Int16Array(buffer, 44);
  for (let i = 0; i < numSamples; i++) {
    // 매우 조용한 랜덤 노이즈 (진폭 ~0.003%)
    samples[i] = Math.floor((Math.random() * 2 - 1) * 1);
  }

  // Convert to base64 data URL
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return 'data:audio/wav;base64,' + btoa(binary);
}

/**
 * DataView에 문자열 쓰기 헬퍼
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
