/**
 * bnk-parser.ts - BNK (Instrument Bank) 파일 파서
 *
 * EPLAYROL.C의 LoadBank() 함수 포팅
 * 원본: /Users/gcjjyy/oscc/adlib/erol/EPLAYROL.C:79-138
 */

import { BinaryReader } from "./binary-reader";
import type { BNKData, BNKHeader } from "./types";

/**
 * BNK 파일 파싱
 *
 * @param buffer BNK 파일의 ArrayBuffer
 * @returns 파싱된 BNK 데이터
 */
export function parseBNK(buffer: ArrayBuffer): BNKData {
  const reader = new BinaryReader(buffer);

  // 헤더 파싱
  const header = parseBNKHeader(reader);

  // 악기 데이터는 빈 Map으로 초기화
  const instruments = new Map<string, number[]>();

  return {
    header,
    instruments,
  };
}

/**
 * BNK 헤더 파싱
 */
function parseBNKHeader(reader: BinaryReader): BNKHeader {
  // 오프셋 0: version (2바이트)
  reader.seek(0);
  const version = reader.readUint16();

  // 오프셋 2: signature (6바이트) - "ADLIB-"
  const signature = reader.readString(6, true);

  // 오프셋 8: 악기 개수 (2바이트)
  reader.seek(8);
  const insMaxNum = reader.readUint16();

  // 오프셋 10: padding (2바이트)
  reader.skip(2);

  // 오프셋 12: 악기 리스트 오프셋 (4바이트 long)
  const insListOff = reader.readUint32();

  // 오프셋 16: 악기 데이터 오프셋 (4바이트 long)
  const insDataOff = reader.readUint32();

  return {
    version,
    signature,
    insMaxNum,
    insListOff,
    insDataOff,
  };
}

/**
 * 특정 악기들을 BNK 파일에서 로드
 *
 * EPLAYROL.C의 LoadBank() 로직을 구현
 * 이진 탐색을 사용하여 악기를 검색
 *
 * @param buffer BNK 파일의 ArrayBuffer
 * @param instrumentNames 로드할 악기 이름 배열
 * @returns 악기 이름 → 파라미터 배열 (28바이트) 맵
 */
export function loadInstruments(
  buffer: ArrayBuffer,
  instrumentNames: string[]
): Map<string, number[]> {
  const reader = new BinaryReader(buffer);
  const header = parseBNKHeader(reader);
  const instruments = new Map<string, number[]>();

  // 각 악기에 대해 이진 탐색
  for (const insName of instrumentNames) {
    const params = findInstrument(reader, header, insName);
    if (params) {
      instruments.set(insName, params);
    }
  }

  return instruments;
}

/**
 * 이진 탐색으로 악기 찾기
 *
 * EPLAYROL.C:114-135 로직 구현
 */
function findInstrument(
  reader: BinaryReader,
  header: BNKHeader,
  targetName: string
): number[] | null {
  let top = 0;
  let bottom = header.insMaxNum - 1;
  let mid = Math.floor(bottom / 2);

  let diff = 0;
  const name = new Array(9).fill(0);

  // 이진 탐색
  do {
    // 악기 리스트에서 mid 위치의 이름 읽기
    // 각 항목은 12바이트: index(2) + flag(1) + name(9)
    reader.seek(header.insListOff + mid * 12 + 3); // flag 다음부터 name
    const currentName = reader.readString(9, true);

    // 대소문자 구분 없이 비교 (strcmpi)
    diff = strcmpi(targetName, currentName);

    if (diff !== 0) {
      if (diff < 0) {
        bottom = mid - 1;
      } else {
        top = mid + 1;
      }
      mid = Math.floor((bottom + top) / 2);
    }
  } while (diff !== 0 && top <= bottom);

  // 찾지 못함
  if (diff !== 0) {
    return null;
  }

  // 찾았으면 데이터 읽기
  // 악기 리스트에서 index 읽기
  reader.seek(header.insListOff + mid * 12);
  const insIndex = reader.readUint16();

  // 악기 데이터 읽기
  // 각 악기 데이터는 30바이트: percussion(1) + voiceNumber(1) + params(28)
  reader.seek(header.insDataOff + insIndex * 30 + 2); // percussion, voiceNumber 건너뛰기

  const params: number[] = [];
  for (let j = 0; j < 28; j++) {
    params.push(reader.readUint8());
  }

  return params;
}

/**
 * 대소문자 구분 없는 문자열 비교 (C의 strcmpi)
 *
 * @returns 0 if equal, <0 if a < b, >0 if a > b
 */
function strcmpi(a: string, b: string): number {
  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower < bLower) return -1;
  if (aLower > bLower) return 1;
  return 0;
}
