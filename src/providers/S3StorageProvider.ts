import { 
  S3Client, 
  GetObjectCommand, 
  PutObjectCommand, 
  ListObjectsV2Command, 
  DeleteObjectCommand, 
  HeadObjectCommand 
} from '@aws-sdk/client-s3';
import type { IStorageProvider } from '../types.js';

export interface S3Config {
  bucket: string;
  region: string;
  endpoint?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3Config) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: config.credentials,
    });
    this.bucket = config.bucket;
  }

  async get(filePath: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });
      const response = await this.client.send(command);
      if (!response.Body) return null;
      
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (error: any) {
      if (error.name === 'NoSuchKey') return null;
      throw error;
    }
  }

  async put(filePath: string, data: Buffer | string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
      Body: data,
    });
    await this.client.send(command);
  }

  async list(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });
    const response = await this.client.send(command);
    return response.Contents?.map(item => item.Key!) || [];
  }

  async delete(filePath: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });
    await this.client.send(command);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filePath,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') return false;
      throw error;
    }
  }

  async stat(filePath: string): Promise<{ size: number; mtimeMs: number; isDirectory: boolean }> {
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: filePath,
    });
    const response = await this.client.send(command);
    return {
      size: response.ContentLength || 0,
      mtimeMs: response.LastModified?.getTime() || 0,
      isDirectory: false, // S3 doesn't have true directories
    };
  }
}
