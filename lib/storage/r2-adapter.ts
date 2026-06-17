import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@/lib/r2";
import { VaultStorageEngine } from "./store";

export class R2StorageAdapter implements VaultStorageEngine {
  async presignUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || "",
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(s3, command, { expiresIn });
  }

  async presignDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!process.env.R2_BUCKET_NAME) {
      throw new Error("R2_BUCKET_NAME is not configured");
    }
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn });
  }

  async downloadFile(key: string): Promise<Buffer> {
    if (!process.env.R2_BUCKET_NAME) {
      throw new Error("R2_BUCKET_NAME is not configured");
    }
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
    if (!response.Body) {
      throw new Error("Response body is empty");
    }
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async deleteFile(key: string): Promise<void> {
    if (!process.env.R2_BUCKET_NAME) {
      throw new Error("R2_BUCKET_NAME is not configured");
    }
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
  }
}
