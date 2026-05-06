declare module 'image-size' {
  export type ImageInfo = {
    width?: number;
    height?: number;
    type?: string;
    orientation?: number;
  };

  export function imageSize(input: Uint8Array | ArrayBuffer | Buffer): ImageInfo;
}
