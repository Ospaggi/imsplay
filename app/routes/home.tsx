import type { Route } from "./+types/home";
import MusicPlayer from "~/components/MusicPlayer";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ADLIB MUSIC PLAYER - ROL & IMS PLAYER" },
    { name: "description", content: "브라우저에서 OPL2 FM 신시사이저로 AdLib ROL과 IMS 음악 파일을 재생하세요" },
  ];
}

export default function Home() {
  return (
    <div>
      <MusicPlayer />
    </div>
  );
}
