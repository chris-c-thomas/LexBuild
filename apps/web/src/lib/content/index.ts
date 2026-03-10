import type { ContentProvider, NavProvider } from "./types";

let _content: ContentProvider | null = null;
let _nav: NavProvider | null = null;

/** Returns the singleton ContentProvider based on CONTENT_STORAGE env var. */
export async function getContentProvider(): Promise<ContentProvider> {
  if (!_content) {
    const storage = process.env.CONTENT_STORAGE ?? "fs";
    switch (storage) {
      case "fs": {
        const { FsContentProvider } = await import("./fs-provider");
        _content = new FsContentProvider();
        break;
      }
      case "s3": {
        const { S3ContentProvider } = await import("./s3-provider");
        _content = new S3ContentProvider();
        break;
      }
      default:
        throw new Error(`Unknown CONTENT_STORAGE: ${storage}`);
    }
  }
  return _content;
}

/** Returns the singleton NavProvider based on CONTENT_STORAGE env var. */
export async function getNavProvider(): Promise<NavProvider> {
  if (!_nav) {
    const storage = process.env.CONTENT_STORAGE ?? "fs";
    switch (storage) {
      case "fs": {
        const { FsNavProvider } = await import("./fs-provider");
        _nav = new FsNavProvider();
        break;
      }
      case "s3": {
        const { S3NavProvider } = await import("./s3-provider");
        _nav = new S3NavProvider();
        break;
      }
      default:
        throw new Error(`Unknown CONTENT_STORAGE: ${storage}`);
    }
  }
  return _nav;
}
