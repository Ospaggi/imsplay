/**
 * 파일 존재 여부 확인 API
 *
 * GET /api/check-file?path=filename.BNK
 * - public 폴더 내 파일 존재 여부 확인
 * - 404 콘솔 로그 방지를 위해 사용
 */

import { existsSync } from 'fs';
import { join } from 'path';

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const filePath = url.searchParams.get('path');

  if (!filePath) {
    return Response.json({ exists: false });
  }

  // path traversal 방지
  const normalizedPath = filePath.replace(/\.\./g, '').replace(/^\/+/, '');

  // public 폴더 내 파일 확인
  const fullPath = join(process.cwd(), 'public', normalizedPath);
  const exists = existsSync(fullPath);

  return Response.json({ exists });
}
