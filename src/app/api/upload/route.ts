import { postCloudinaryMultipartUpload, uploadRuntime } from "@/lib/server-upload/cloudinary-multipart";

export const runtime = uploadRuntime;

/** Studio / ads creatives: multipart → Cloudinary. Ads APIs only store returned URLs. */
export async function POST(req: Request) {
  return postCloudinaryMultipartUpload(req);
}
