export interface VaultStorageEngine {
  presignUploadUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
  downloadFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
}
