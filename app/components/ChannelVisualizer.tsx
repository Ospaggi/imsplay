/**
 * ChannelVisualizer.tsx - 실시간 채널 볼륨 시각화 컴포넌트
 *
 * Impulse Tracker 스타일 세로 채널 미터
 */

import DosPanel from "~/components/dos-ui/DosPanel";
import DosMeter from "~/components/dos-ui/DosMeter";

interface ChannelVisualizerProps {
  channelVolumes: number[]; // 0-127 범위의 볼륨 배열
  maxVolume?: number; // 최대 볼륨 (기본값: 127)
  instrumentNames?: string[]; // 악기명 배열 (옵션)
}

export default function ChannelVisualizer({
  channelVolumes,
  maxVolume = 127,
  instrumentNames,
}: ChannelVisualizerProps) {
  return (
    <DosPanel className="flex-1">
      <div className="flex-col">
        {channelVolumes.map((volume, index) => {
          const label = instrumentNames?.[index] || `채널 ${String(index + 1).padStart(2, '0')}`;

          return (
            <DosMeter
              key={index}
              label={label}
              value={volume}
              maxValue={maxVolume}
            />
          );
        })}
      </div>
    </DosPanel>
  );
}
