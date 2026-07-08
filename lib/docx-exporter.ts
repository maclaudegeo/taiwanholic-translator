import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";
import type { ArticleBlock } from "./article-blocks";

function toParagraph(block: ArticleBlock, titleOverride?: string) {
  const baseText = block.polishedText ?? block.translatedText ?? block.sourceText;
  const text =
    block.type === "title" && titleOverride?.trim() ? titleOverride.trim() : baseText;

  switch (block.type) {
    case "title":
      return new Paragraph({
        text,
        heading: HeadingLevel.TITLE,
        spacing: { after: 280 }
      });
    case "heading":
      return new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 120 }
      });
    case "seo_description":
      return new Paragraph({
        children: [
          new TextRun({ text: "SEO: ", bold: true }),
          new TextRun(text)
        ],
        spacing: { after: 140 }
      });
    case "caption":
      return new Paragraph({
        children: [new TextRun({ text, italics: true })],
        spacing: { after: 120 }
      });
    case "paragraph":
    default:
      return new Paragraph({
        text,
        spacing: { after: 160 }
      });
  }
}

export async function buildDocxBuffer(
  blocks: ArticleBlock[],
  titleOverride?: string
) {
  const document = new Document({
    title: titleOverride?.trim() || "Translated Taiwan Travel Article",
    features: {
      updateFields: false
    },
    sections: [
      {
        properties: {
          titlePage: true
        },
        children: blocks.map((block) => toParagraph(block, titleOverride))
      }
    ]
  });

  return Packer.toBuffer(document);
}
