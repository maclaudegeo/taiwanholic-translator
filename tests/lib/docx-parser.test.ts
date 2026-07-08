import { Document, HeadingLevel, Packer, Paragraph } from "docx";
import { parseDocxBuffer, parseRawParagraphs } from "../../lib/docx-parser";

describe("parseRawParagraphs", () => {
  it("maps heading styles and body text into ordered article blocks", () => {
    const blocks = parseRawParagraphs([
      { text: "台北早餐推薦", styleName: "Title" },
      { text: "先從台灣早晨開始。", styleName: "Normal" },
      { text: "阜杭豆漿", styleName: "Heading 2" }
    ]);

    expect(blocks.map((block) => block.type)).toEqual([
      "title",
      "paragraph",
      "heading"
    ]);
  });

  it("parses a docx buffer into ordered blocks", async () => {
    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "台北早餐推薦",
              heading: HeadingLevel.TITLE
            }),
            new Paragraph("先從台灣早晨開始。"),
            new Paragraph({
              text: "阜杭豆漿",
              heading: HeadingLevel.HEADING_2
            })
          ]
        }
      ]
    });

    const buffer = await Packer.toBuffer(document);
    const blocks = await parseDocxBuffer(buffer);

    expect(blocks.map((block) => block.type)).toEqual([
      "title",
      "paragraph",
      "heading"
    ]);
    expect(blocks[0]?.sourceText).toBe("台北早餐推薦");
  });
});
