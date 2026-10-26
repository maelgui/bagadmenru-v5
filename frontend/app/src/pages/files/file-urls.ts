import env from '@/env';

const base = () => env.VITE_BBE2_API_URL || '';

export function fileViewUrl(fileId: number): string {
  return `${base()}/api/v1/files/${fileId}/view`;
}

export function fileDownloadUrl(fileId: number): string {
  return `${base()}/api/v1/files/${fileId}/download`;
}

export function fileVersionDownloadUrl(fileId: number, versionId: number): string {
  return `${base()}/api/v1/files/${fileId}/versions/${versionId}/download`;
}
