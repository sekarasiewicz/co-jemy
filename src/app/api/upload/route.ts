import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

// Client-side upload token endpoint for Vercel Blob.
// Lets the browser upload directly to Blob (bypasses the 4.5MB serverless body limit).
const UPLOAD_FOLDERS = ["meals/", "ingredients/", "profiles/"];

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await getSession();
        if (!session?.user) {
          throw new Error("Musisz być zalogowany, aby przesłać zdjęcie");
        }
        if (
          !UPLOAD_FOLDERS.some((folder) => pathname.startsWith(folder)) ||
          pathname.includes("..")
        ) {
          throw new Error("Nieprawidłowa ścieżka pliku");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
          ],
          maximumSizeInBytes: 8 * 1024 * 1024, // 8 MB
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // No-op: URL is persisted via the form save action.
      },
    });

    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
