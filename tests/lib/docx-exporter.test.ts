import JSZip from "jszip";
import { Document, HeadingLevel, ImageRun, Packer, Paragraph } from "docx";
import { buildDocxBuffer } from "../../lib/docx-exporter";
import { sampleBlocks } from "../fixtures/sample-article";

describe("buildDocxBuffer", () => {
  it("creates a docx buffer from polished article blocks", async () => {
    const buffer = await buildDocxBuffer(sampleBlocks);

    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("creates a docx buffer with a title override", async () => {
    const buffer = await buildDocxBuffer(sampleBlocks, "自訂標題");

    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("preserves original media files when exporting from the uploaded docx", async () => {
    const imageBytes = Uint8Array.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
      1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65,
      84, 120, 156, 99, 248, 255, 255, 63, 0, 5, 254, 2, 254, 167, 53, 129,
      132, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);

    const original = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "原始標題",
              heading: HeadingLevel.TITLE
            }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBytes,
                  transformation: { width: 40, height: 40 },
                  type: "png"
                })
              ]
            }),
            new Paragraph("原始內文")
          ]
        }
      ]
    });

    const originalBuffer = await Packer.toBuffer(original);
    const exportedBuffer = await buildDocxBuffer(
      [
        {
          ...sampleBlocks[0],
          sourceText: "原始標題",
          polishedText: "翻譯後標題"
        },
        {
          ...sampleBlocks[1],
          sourceText: "原始內文",
          polishedText: "翻譯後內文"
        }
      ],
      "自訂日文標題",
      originalBuffer
    );

    const zip = await JSZip.loadAsync(exportedBuffer);
    const mediaFiles = Object.keys(zip.files).filter((path) =>
      path.startsWith("word/media/")
    );
    const documentXml = await zip.file("word/document.xml")?.async("text");

    expect(mediaFiles.length).toBeGreaterThan(0);
    expect(documentXml).toContain("自訂日文標題");
    expect(documentXml).toContain("翻譯後內文");
  });

  it("replaces text inside Google Docs content controls when exporting", async () => {
    const original = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "原始標題",
              heading: HeadingLevel.TITLE
            }),
            new Paragraph("原始內文")
          ]
        }
      ]
    });

    const originalBuffer = await Packer.toBuffer(original);
    const zip = await JSZip.loadAsync(originalBuffer);
    const documentXml = await zip.file("word/document.xml")?.async("text");

    if (!documentXml) {
      throw new Error("Missing document.xml");
    }

    const wrappedXml = documentXml
      .replace(
        "<w:t xml:space=\"preserve\">原始標題</w:t>",
        "<w:sdt><w:sdtPr><w:id w:val=\"1\"/></w:sdtPr><w:sdtContent><w:r><w:t xml:space=\"preserve\">原始標題</w:t></w:r></w:sdtContent></w:sdt>"
      )
      .replace(
        "<w:t xml:space=\"preserve\">原始內文</w:t>",
        "<w:sdt><w:sdtPr><w:id w:val=\"2\"/></w:sdtPr><w:sdtContent><w:r><w:t xml:space=\"preserve\">原始內文</w:t></w:r></w:sdtContent></w:sdt>"
      );

    zip.file("word/document.xml", wrappedXml);
    const contentControlBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const exportedBuffer = await buildDocxBuffer(
      [
        {
          ...sampleBlocks[0],
          sourceText: "原始標題",
          polishedText: "翻譯後標題"
        },
        {
          ...sampleBlocks[1],
          sourceText: "原始內文",
          polishedText: "翻譯後內文"
        }
      ],
      "自訂日文標題",
      contentControlBuffer
    );

    const exportedZip = await JSZip.loadAsync(exportedBuffer);
    const exportedXml = await exportedZip.file("word/document.xml")?.async("text");

    expect(exportedXml).toContain("自訂日文標題");
    expect(exportedXml).toContain("翻譯後內文");
    expect(exportedXml).not.toContain("原始標題");
    expect(exportedXml).not.toContain("原始內文");
  });
});
