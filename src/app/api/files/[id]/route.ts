import { NextRequest, NextResponse } from "next/server";
import { storageProvider } from "@/lib/storage";
import { withErrorHandler, AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: { id: string } }) => {
    const filename = params.id;
    if (!filename) {
      throw AppError.badRequest("Filename parameter is required.");
    }

    const file = await storageProvider.getFile(filename);
    if (!file) {
      throw AppError.notFound("Requested file does not exist.");
    }

    const response = new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });

    return response;
  }
);
