import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IStorageProvider } from '../types';

export interface SupabaseConfig {
  url: string;
  key: string;
  bucket: string;
}

export class SupabaseStorageProvider implements IStorageProvider {
  private client: SupabaseClient;
  private bucket: string;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.key);
    this.bucket = config.bucket;
  }

  async get(filePath: string): Promise<Buffer | null> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(filePath);

    if (error) {
      if (error.message.includes('The object was not found')) return null;
      throw error;
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async put(filePath: string, data: Buffer | string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(filePath, data, {
        upsert: true,
      });

    if (error) throw error;
  }

  async list(prefix: string): Promise<string[]> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(prefix, {
        limit: 1000,
      });

    if (error) throw error;
    return data.map(item => `${prefix}/${item.name}`);
  }

  async delete(filePath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([filePath]);

    if (error) throw error;
  }

  async exists(filePath: string): Promise<boolean> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1),
      });

    if (error) return false;
    return data && data.length > 0;
  }

  async stat(filePath: string): Promise<{ size: number; mtimeMs: number; isDirectory: boolean }> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1),
      });

    if (error || !data || data.length === 0) {
      throw new Error('File not found');
    }

    const file = data[0];
    return {
      size: file.metadata?.size || 0,
      mtimeMs: file.updated_at ? new Date(file.updated_at).getTime() : 0,
      isDirectory: false,
    };
  }
}
