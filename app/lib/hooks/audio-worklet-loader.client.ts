/**
 * audio-worklet-loader.client.ts
 *
 * .client.ts 확장자로 SSR 빌드에서 완전히 제외됨.
 * 자체 구현된 queue-stream 모듈을 클라이언트에서만 로드.
 */

export async function createStreamNodeFactory(audioContext: AudioContext) {
  const { StreamNodeFactory } = await import("../audio-queue/queue-stream");
  return StreamNodeFactory.create(audioContext);
}
