declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    TRUST_SITES_IDENTITY?: string;
  }
}
