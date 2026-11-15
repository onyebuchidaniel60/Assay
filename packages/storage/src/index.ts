import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function storageConfigFromEnv(env: NodeJS.ProcessEnv = process.env): StorageConfig {
  const required = {
    endpoint: env.AWS_ENDPOINT_URL_S3,
    region: env.AWS_REGION,
    bucket: env.NEON_STORAGE_BUCKET,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) throw new Error(`Missing storage configuration: ${missing.join(", ")}`);
  return required as StorageConfig;
}

export function createStorageClient(config = storageConfigFromEnv()): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export class PrivateObjectStorage {
  private readonly client: S3Client;
  constructor(private readonly config = storageConfigFromEnv()) {
    this.client = createStorageClient(config);
  }

  async put(key: string, body: Uint8Array, contentType = "application/octet-stream"): Promise<{ key: string; size: number }> {
    const response = await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: "AES256",
      }),
    );
    if (!response.ETag) throw new Error("Object storage did not confirm the write.");
    return { key, size: body.byteLength };
  }

  async get(key: string): Promise<Uint8Array> {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    if (!response.Body) throw new Error("Object storage returned an empty body.");
    return response.Body.transformToByteArray();
  }

  async head(key: string): Promise<{ size: number | undefined; etag: string | undefined }> {
    const response = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
    return { size: response.ContentLength, etag: response.ETag };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  async list(prefix = ""): Promise<Array<{ key: string; size: number | undefined }>> {
    const response = await this.client.send(new ListObjectsV2Command({ Bucket: this.config.bucket, Prefix: prefix }));
    return (response.Contents ?? []).map((item) => ({ key: item.Key ?? "", size: item.Size }));
  }

  async presignGet(key: string, expiresInSeconds = 60): Promise<string> {
    const seconds = Math.max(1, Math.min(60, Math.floor(expiresInSeconds)));
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.config.bucket, Key: key }), {
      expiresIn: seconds,
    });
  }
}
