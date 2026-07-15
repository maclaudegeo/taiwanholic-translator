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

  it("keeps embedded image geometry intact so photos are not resized", async () => {
    // Regression: an empty attributeNamePrefix made the XML round-trip collapse
    // empty drawing elements (<a:fillRect/>, <a:avLst/>, <a:srcRect/>) into empty
    // attributes, corrupting the picture markup and shrinking photos in Word.
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
            new Paragraph({ text: "原始標題", heading: HeadingLevel.TITLE }),
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBytes,
                  transformation: { width: 200, height: 150 },
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
    const originalXml = await (await JSZip.loadAsync(originalBuffer))
      .file("word/document.xml")
      ?.async("text");

    if (!originalXml) {
      throw new Error("Missing document.xml");
    }

    const originalExtents = [
      ...originalXml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g)
    ].map((match) => `${match[1]}x${match[2]}`);

    expect(originalExtents.length).toBeGreaterThan(0);

    const exportedBuffer = await buildDocxBuffer(
      [
        { ...sampleBlocks[0], sourceText: "原始標題", polishedText: "翻譯後標題" },
        { ...sampleBlocks[1], sourceText: "原始內文", polishedText: "翻譯後內文" }
      ],
      "自訂日文標題",
      originalBuffer
    );

    const exportedXml = await (await JSZip.loadAsync(exportedBuffer))
      .file("word/document.xml")
      ?.async("text");

    if (!exportedXml) {
      throw new Error("Missing exported document.xml");
    }

    const exportedExtents = [
      ...exportedXml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/g)
    ].map((match) => `${match[1]}x${match[2]}`);

    // Image dimensions are byte-for-byte unchanged.
    expect(exportedExtents).toEqual(originalExtents);

    // Empty drawing elements survive as self-closing tags, not empty attributes.
    expect(exportedXml).toContain("<a:fillRect/>");
    expect(exportedXml).toContain("<a:avLst/>");
    expect(exportedXml).not.toMatch(/a:fillRect=""/);
    expect(exportedXml).not.toMatch(/a:avLst=""/);
    expect(exportedXml).not.toMatch(/a:srcRect=""/);
    expect(exportedXml).not.toMatch(/pic:cNvPicPr=""/);

    // The image reference is preserved and the translation still applied.
    expect(exportedXml).toMatch(/r:embed="rId\d+"/);
    expect(exportedXml).toContain("翻譯後內文");
  });

  it("keeps translated text as elements for bare w:t runs (no xml:space)", async () => {
    // Regression: real Word documents use bare <w:t>文字</w:t> without an
    // xml:space attribute. An empty attributeNamePrefix made the XML builder
    // treat those text elements as attributes (<w:r w:t="文字">), so Word showed
    // no text at all in the downloaded file.
    const original = new Document({
      sections: [
        {
          children: [
            new Paragraph({ text: "原始標題", heading: HeadingLevel.TITLE }),
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

    // Strip xml:space to mimic Word's bare <w:t> runs.
    const bareXml = documentXml.replace(/<w:t xml:space="preserve">/g, "<w:t>");
    expect(bareXml).toContain("<w:t>原始標題</w:t>");
    zip.file("word/document.xml", bareXml);
    const bareBuffer = await zip.generateAsync({ type: "nodebuffer" });

    const exportedBuffer = await buildDocxBuffer(
      [
        { ...sampleBlocks[0], sourceText: "原始標題", polishedText: "翻譯後標題" },
        { ...sampleBlocks[1], sourceText: "原始內文", polishedText: "翻譯後內文" }
      ],
      "自訂日文標題",
      bareBuffer
    );

    const exportedXml = await (await JSZip.loadAsync(exportedBuffer))
      .file("word/document.xml")
      ?.async("text");

    if (!exportedXml) {
      throw new Error("Missing exported document.xml");
    }

    // Text stays inside <w:t> elements and is never collapsed into attributes.
    expect(exportedXml).toContain("<w:t>自訂日文標題</w:t>");
    expect(exportedXml).toContain("<w:t>翻譯後內文</w:t>");
    expect(exportedXml).not.toMatch(/w:t="[^"]/);
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
