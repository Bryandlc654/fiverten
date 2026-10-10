import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

/**
 * Almacenamiento de archivos en Cloudflare R2 (API compatible con S3).
 * Todo queda preparado; solo hay que rellenar las variables R2_* para activarlo.
 * Si no esta configurado, los endpoints de subida responden 503.
 */
@Injectable()
export class MediaService {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.bucket &&
        this.publicBaseUrl &&
        this.config.get<string>('R2_ACCESS_KEY_ID') &&
        this.config.get<string>('R2_SECRET_ACCESS_KEY') &&
        (this.config.get<string>('R2_ENDPOINT') || this.config.get<string>('R2_ACCOUNT_ID')),
    );
  }

  async uploadOrganizationCover(orgId: string, file: UploadedImage): Promise<string> {
    const client = this.getClient();
    const extension = MIME_EXTENSIONS[file.mimetype] ?? 'jpg';
    const key = `organizations/${orgId}/cover/${randomUUID()}.${extension}`;

    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return `${this.publicBaseUrl}/${key}`;
  }

  private get bucket(): string {
    return this.config.get<string>('R2_BUCKET') ?? '';
  }

  private get publicBaseUrl(): string {
    return (this.config.get<string>('R2_PUBLIC_BASE_URL') ?? '').replace(/\/+$/, '');
  }

  private getClient(): S3Client {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'El almacenamiento de imagenes no esta configurado. Intentalo mas tarde.',
      );
    }
    if (!this.client) {
      const endpoint =
        this.config.get<string>('R2_ENDPOINT') ??
        `https://${this.config.get<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`;
      this.client = new S3Client({
        region: this.config.get<string>('R2_REGION') ?? 'auto',
        endpoint,
        credentials: {
          accessKeyId: this.config.get<string>('R2_ACCESS_KEY_ID') as string,
          secretAccessKey: this.config.get<string>('R2_SECRET_ACCESS_KEY') as string,
        },
      });
    }
    return this.client;
  }
}
