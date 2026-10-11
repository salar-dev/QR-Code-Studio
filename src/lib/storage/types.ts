export interface StoredObject {
  /** Publicly reachable URL that will be encoded in the QR code. */
  url: string;
  /** Provider-specific object path. */
  path: string;
}

export interface UploadInput {
  bytes: Uint8Array;
  contentType: string;
  extension: string;
}

/**
 * Storage abstraction for hosted files. Implement this interface to add a
 * provider (S3, R2, GCS…) and return it from `getStorageProvider()`.
 */
export interface StorageProvider {
  readonly name: string;
  upload(input: UploadInput): Promise<StoredObject>;
}
