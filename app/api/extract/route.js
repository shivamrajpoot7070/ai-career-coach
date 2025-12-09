import { NextResponse } from "next/server";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);

    // Load the PDF
    const pdf = await pdfjs.getDocument({ data: typedArray }).promise;

    let extractedText = "";

    // Read all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const pageText = content.items.map((i) => i.str).join(" ");
      extractedText += pageText + "\n\n";
    }

    return NextResponse.json({ text: extractedText });
  } catch (err) {
    console.error("PDF extract error:", err);
    return NextResponse.json(
      { error: "Failed to extract PDF" },
      { status: 500 }
    );
  }
}
