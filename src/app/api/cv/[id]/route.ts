/**
 * CV FILE DOWNLOAD: /api/cv/1 sends back the file uploaded for CV number 1.
 * PDFs open in the browser; any other file type is downloaded instead (safer).
 */
import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/server/database";
import { getCvFile } from "@/server/queries";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = getCvFile(Number(id));
  if (!row?.file_path) return new Response("Not found", { status: 404 });

  const full = path.join(UPLOAD_DIR, path.basename(row.file_path));
  if (!fs.existsSync(full)) return new Response("Not found", { status: 404 });

  const name = (row.file_name ?? "cv").replace(/[^\w.\- ]/g, "_");
  // Only PDFs open in the browser; anything else downloads, so an uploaded
  // HTML/SVG file can never run as a page on this site.
  const isPdf = row.file_type === "application/pdf";
  return new Response(fs.readFileSync(full), {
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
      "Content-Disposition": `${isPdf ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
