import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

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

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

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
    if (!this.isConfigured()) {
      return this.storeInDatabase({ organizationId: orgId, kind: 'cover' }, file);
    }
    return this.upload(`organizations/${orgId}/cover`, file);
  }

  async uploadAvatar(userId: string, file: UploadedImage): Promise<string> {
    if (!this.isConfigured()) {
      return this.storeInDatabase({ userId, kind: 'avatar' }, file);
    }
    return this.upload(`users/${userId}/avatar`, file);
  }

  async uploadOrganizationLogo(orgId: string, file: UploadedImage): Promise<string> {
    if (!this.isConfigured()) {
      return this.storeInDatabase({ organizationId: orgId, kind: 'logo' }, file);
    }
    return this.upload(`organizations/${orgId}/logo`, file);
  }

  /** Imagen pública guardada en la base (fallback sin R2). */
  async getFile(id: string): Promise<{ data: Buffer; mimeType: string }> {
    const file = await this.prisma.withContext({}, (tx) =>
      tx.mediaFile.findUnique({ where: { id }, select: { data: true, mimeType: true } }),
    );
    if (!file) {
      throw new NotFoundException('Imagen no encontrada');
    }
    return { data: Buffer.from(file.data), mimeType: file.mimeType };
  }

  private async storeInDatabase(
    owner: { organizationId?: string; userId?: string; kind: string },
    file: UploadedImage,
  ): Promise<string> {
    const record = await this.prisma.withContext(
      { orgId: owner.organizationId ?? null, userId: owner.userId ?? null },
      (tx) =>
        tx.mediaFile.create({
          data: {
            organizationId: owner.organizationId ?? null,
            userId: owner.userId ?? null,
            kind: owner.kind,
            mimeType: file.mimetype,
            size: file.size,
            data: file.buffer,
          },
          select: { id: true },
        }),
    );
    return `/api/media/files/${record.id}`;
  }

  private async upload(prefix: string, file: UploadedImage): Promise<string> {
    const client = this.getClient();
    const extension = MIME_EXTENSIONS[file.mimetype] ?? 'jpg';
    const key = `${prefix}/${randomUUID()}.${extension}`;

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
      throw new NotFoundException('El almacenamiento de imagenes no esta configurado');
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
