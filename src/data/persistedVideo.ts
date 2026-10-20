export interface PersistedVideoInfo {
  type: 'url' | 'file';
  url: string;
  name: string;
  description?: string;
  size?: number;
  uploadedAt: string;
}
