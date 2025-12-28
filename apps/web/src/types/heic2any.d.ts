/**
 * Type definitions for heic2any library
 * @see https://github.com/nicco-pn/heic2any
 */

declare module "heic2any" {
  export interface Heic2AnyOptions {
    /** Input HEIC/HEIF blob or file */
    blob: Blob | File;
    /** Output format - defaults to "image/png" */
    toType?: "image/jpeg" | "image/png" | "image/gif";
    /** Quality for JPEG output (0-1) - defaults to 0.92 */
    quality?: number;
    /** For multi-image HEIC, return all images */
    multiple?: boolean;
  }

  /**
   * Convert HEIC/HEIF images to other formats
   * @param options - Conversion options
   * @returns Promise resolving to converted Blob or array of Blobs (if multiple=true or multi-image HEIC)
   */
  function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>;

  export default heic2any;
}
