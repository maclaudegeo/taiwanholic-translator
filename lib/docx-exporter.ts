import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun
} from "docx";
import JSZip from "jszip";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type { ArticleBlock } from "./article-blocks";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
});

const xmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  suppressEmptyNode: false
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function extractText(node: unknown): string {
  if (typeof node === "string") {
    return node;
  }

  if (!node || typeof node !== "object") {
    return "";
  }

  const record = node as Record<string, unknown>;

  if (typeof record["#text"] === "string") {
    return record["#text"];
  }

  return "";
}

function collectTextValues(node: unknown, output: string[]) {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectTextValues(item, output);
    }
    return;
  }

  const record = node as Record<string, unknown>;

  for (const [key, value] of Object.entries(record)) {
    if (key === "w:instrText") {
      continue;
    }

    if (key === "w:t") {
      if (typeof value === "string") {
        output.push(value);
      } else if (value && typeof value === "object") {
        const textNode = (value as Record<string, unknown>)["#text"];

        if (typeof textNode === "string") {
          output.push(textNode);
        }
      }
      continue;
    }

    collectTextValues(value, output);
  }
}

function getParagraphText(paragraph: Record<string, unknown>) {
  const texts: string[] = [];
  collectTextValues(paragraph, texts);
  return texts.join("").replace(/\s+/g, " ").trim();
}

function replaceTextValues(
  node: unknown,
  nextText: string
): { consumed: boolean; remainingText: string } {
  if (!node || typeof node !== "object") {
    return { consumed: false, remainingText: nextText };
  }

  if (Array.isArray(node)) {
    let remainingText = nextText;
    let consumed = false;

    for (const item of node) {
      const result = replaceTextValues(item, remainingText);
      consumed = consumed || result.consumed;
      remainingText = result.remainingText;
    }

    return { consumed, remainingText };
  }

  const record = node as Record<string, unknown>;
  let remainingText = nextText;
  let consumed = false;

  for (const [key, value] of Object.entries(record)) {
    if (key === "w:instrText") {
      continue;
    }

    if (key === "w:t") {
      if (typeof value === "string") {
        record[key] = remainingText;
      } else if (value && typeof value === "object") {
        record[key] = {
          ...(value as Record<string, unknown>),
          "#text": remainingText
        };
      }

      consumed = true;
      remainingText = "";
      continue;
    }

    const result = replaceTextValues(value, remainingText);
    consumed = consumed || result.consumed;
    remainingText = result.remainingText;
  }

  return { consumed, remainingText };
}

function replaceParagraphText(
  paragraph: Record<string, unknown>,
  replacementText: string
) {
  const { consumed } = replaceTextValues(paragraph, replacementText);

  if (!consumed) {
    const runs = asArray(paragraph["w:r"]);
    const firstRun =
      runs.find((runNode) => runNode && typeof runNode === "object") ?? {};

    const nextRun =
      typeof firstRun === "object"
        ? {
            ...(firstRun as Record<string, unknown>),
            "w:t": replacementText
          }
        : { "w:t": replacementText };

    paragraph["w:r"] = [nextRun];
  }
}

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
  titleOverride?: string,
  originalBuffer?: ArrayBuffer | Buffer
) {
  if (originalBuffer) {
    try {
      const zip = await JSZip.loadAsync(originalBuffer);
      const documentEntry = zip.file("word/document.xml");
      const documentXml = await documentEntry?.async("text");

      if (documentXml) {
        const documentDoc = xmlParser.parse(documentXml) as Record<string, unknown>;
        const body = (documentDoc["w:document"] as Record<string, unknown>)?.[
          "w:body"
        ] as Record<string, unknown> | undefined;

        if (body) {
          const paragraphNodes = asArray(body["w:p"]).filter(
            (paragraphNode): paragraphNode is Record<string, unknown> =>
              Boolean(paragraphNode) && typeof paragraphNode === "object"
          );
          const textBlocks = blocks.filter((block) => block.sourceText.trim());
          let blockIndex = 0;

          for (const paragraphNode of paragraphNodes) {
            const paragraphText = getParagraphText(paragraphNode);

            if (!paragraphText) {
              continue;
            }

            const block = textBlocks[blockIndex];

            if (!block) {
              break;
            }

            const baseText =
              block.polishedText ?? block.translatedText ?? block.sourceText;
            const replacementText =
              block.type === "title" && titleOverride?.trim()
                ? titleOverride.trim()
                : baseText;

            replaceParagraphText(paragraphNode, replacementText);
            blockIndex += 1;
          }

          zip.file("word/document.xml", xmlBuilder.build(documentDoc));
          return zip.generateAsync({ type: "nodebuffer" });
        }
      }
    } catch {
      // Fall back to a regenerated docx if the original upload cannot be reused.
    }
  }

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
