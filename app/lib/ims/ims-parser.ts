/**
 * ims-parser.ts - IMS 파일 파서
 *
 * IMS (Interactive Music System) 파일 형식 파싱
 * 원본: /Users/gcjjyy/oscc/adlib/ims/IMS.C의 load_ims()
 */

import { BinaryReader } from "../rol/binary-reader";
import type { IMSData } from "./ims-types";

/**
 * IMS 파일 파싱
 *
 * IMS 파일 구조:
 * - Offset 6: 곡 이름 (30바이트)
 * - Offset 42: byte_size (4바이트, uint32) - 음악 데이터 크기
 * - Offset 58: d_mode (1바이트, uint8) - 0=멜로디, 1=퍼커션
 * - Offset 60: basic_tempo (2바이트, uint16) - 기본 템포
 * - Offset 71: 음악 데이터 시작 (이벤트 스트림)
 * - 음악 데이터 끝: separator (1바이트)
 * - ins_num (2바이트, uint16) - 악기 개수
 * - 악기 이름들 (각 9바이트)
 *
 * @param buffer IMS 파일의 ArrayBuffer
 * @returns 파싱된 IMS 데이터
 */
export function parseIMS(buffer: ArrayBuffer): IMSData {
  const reader = new BinaryReader(buffer);

  // Offset 6: 곡 이름 (30바이트)
  // 서버 사이드에서 제목을 변환하므로 여기서는 스킵
  reader.seek(6);
  reader.skip(30);
  const songName = ""; // 제목은 서버에서 제공

  // Offset 42: byte_size (음악 데이터 크기)
  reader.seek(42);
  const byteSize = reader.readUint32();

  // Offset 58: d_mode
  reader.seek(58);
  const dMode = reader.readUint8();
  const chNum = 9 + dMode * 2;  // 9 or 11 channels

  // Offset 60: basic_tempo
  reader.seek(60);
  const basicTempo = reader.readUint16();

  // Offset 71: 음악 데이터 시작
  reader.seek(71);

  // 음악 데이터를 32KB 페이지로 분할하여 읽기
  const musicData: Uint8Array[] = [];
  const pageSize = 32768;
  const pageNum = Math.floor(byteSize / pageSize);
  const pageEtc = byteSize % pageSize;

  // 전체 페이지 읽기
  for (let i = 0; i < pageNum; i++) {
    musicData.push(reader.readBytes(pageSize));
  }

  // 나머지 바이트 읽기
  if (pageEtc > 0) {
    musicData.push(reader.readBytes(pageEtc));
  }

  // Separator 건너뛰기 (1바이트)
  reader.skip(1);

  // 악기 개수 읽기
  const insNum = reader.readUint16();

  // 악기 이름 읽기 (각 9바이트, 소문자)
  const insNames: string[] = [];
  for (let i = 0; i < insNum; i++) {
    const name = reader.readString(9, true).toLowerCase();
    insNames.push(name);
  }

  return {
    songName,
    byteSize,
    dMode,
    basicTempo,
    chNum,
    musicData,
    insNum,
    insNames,
  };
}

/**
 * 페이지 메모리에서 바이트 읽기
 *
 * IMS는 32KB 페이지 시스템을 사용하여 큰 파일을 처리합니다.
 * (원본 IMS.C의 readmem() 함수)
 *
 * @param musicData 페이지 배열
 * @param offset 읽을 바이트 오프셋
 * @returns 읽은 바이트 값 (0-255)
 */
export function readPagedByte(musicData: Uint8Array[], offset: number): number {
  const pageSize = 32768;
  const pageIndex = Math.floor(offset / pageSize);
  const byteIndex = offset % pageSize;

  if (pageIndex >= musicData.length) {
    return 0;  // Out of bounds
  }

  const page = musicData[pageIndex];
  if (byteIndex >= page.length) {
    return 0;  // Out of bounds
  }

  return page[byteIndex];
}
