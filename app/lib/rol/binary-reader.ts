/**
 * BinaryReader - 16비트 DOS 환경을 위한 바이너리 파일 리더
 *
 * EROL은 16비트 컴파일러용으로 작성되었으므로:
 * - int = 2바이트 (16비트)
 * - long = 4바이트 (32비트)
 * - float = 4바이트 (IEEE 754)
 * - char = 1바이트
 *
 * 모든 데이터는 little-endian 형식입니다.
 */
export class BinaryReader {
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  /**
   * int (2바이트, signed)
   */
  readInt16(): number {
    const value = this.view.getInt16(this.offset, true); // little-endian
    this.offset += 2;
    return value;
  }

  /**
   * unsigned int (2바이트, unsigned)
   */
  readUint16(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  /**
   * long (4바이트, signed)
   */
  readInt32(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * unsigned long (4바이트, unsigned)
   */
  readUint32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * float (4바이트, IEEE 754)
   */
  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  /**
   * char (1바이트, unsigned)
   */
  readUint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * signed char (1바이트, signed)
   */
  readInt8(): number {
    const value = this.view.getInt8(this.offset);
    this.offset += 1;
    return value;
  }

  /**
   * 문자열 읽기 (null-terminated 또는 고정 길이)
   * @param length 읽을 바이트 수
   * @param nullTerminated true면 null 문자까지만 문자열로 변환
   */
  readString(length: number, nullTerminated: boolean = true): string {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;

    if (nullTerminated) {
      // null 문자까지만 읽기
      const nullIndex = bytes.indexOf(0);
      const str = new TextDecoder().decode(
        nullIndex >= 0 ? bytes.slice(0, nullIndex) : bytes
      );
      return str;
    } else {
      return new TextDecoder().decode(bytes);
    }
  }

  /**
   * 바이트 배열 읽기
   */
  readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    return bytes;
  }

  /**
   * 절대 위치로 이동
   */
  seek(offset: number): void {
    this.offset = offset;
  }

  /**
   * 상대 위치로 이동
   */
  skip(bytes: number): void {
    this.offset += bytes;
  }

  /**
   * 현재 위치 반환
   */
  tell(): number {
    return this.offset;
  }

  /**
   * 파일 크기 반환
   */
  size(): number {
    return this.view.byteLength;
  }

  /**
   * EOF 체크
   */
  isEOF(): boolean {
    return this.offset >= this.view.byteLength;
  }
}
