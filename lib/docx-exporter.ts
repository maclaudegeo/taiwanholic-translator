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

function getParagraphText(paragraph: Record<string, unknown>) {
  const textFromRuns = asArray(paragraph["w:r"])
    .flatMap((runNode) => {
      if (!runNode || typeof runNode !== "object") {
        return [];
      }

      const runRecord = runNode as Record<string, unknown>;
      return asArray(runRecord["w:t"]).map(extractText);
    })
    .join("");

  const textFromLinks = asArray(paragraph["w:hyperlink"])
    .flatMap((hyperlinkNode) => {
      if (!hyperlinkNode || typeof hyperlinkNode !== "object") {
        return [];
      }

      const hyperlinkRecord = hyperlinkNode as Record<string, unknown>;
      return asArray(hyperlinkRecord["w:r"]).flatMap((runNode) => {
        if (!runNode || typeof runNode !== "object") {
          return [];
        }

        const runRecord = runNode as Record<string, unknown>;
        return asArray(runRecord["w:t"]).map(extractText);
      });
    })
    .join("");

  return `${textFromRuns}${textFromLinks}`.replace(/\s+/g, " ").trim();
}

function setTextNodesOnRun(runNode: Record<string, unknown>, nextText: string) {
  const textNodes = asArray(runNode["w:t"]);

  if (textNodes.length === 0) {
    return { consumed: false, remainingText: nextText };
  }

  const [firstNode, ...restNodes] = textNodes;
  const nextFirstNode =
    typeof firstNode === "string"
      ? nextText
      : {
          ...(firstNode as Record<string, unknown>),
          "#text": nextText
        };

  runNode["w:t"] = [nextFirstNode, ...restNodes.map(() => "")];
  return { consumed: true, remainingText: "" };
}

function replaceParagraphText(
  paragraph: Record<string, unknown>,
  replacementText: string
) {
  let remainingText = replacementText;
  let consumed = false;

  for (const runNode of asArray(paragraph["w:r"])) {
    if (!runNode || typeof runNode !== "object") {
      continue;
    }

    const result = setTextNodesOnRun(
      runNode as Record<string, unknown>,
      remainingText
    );
    consumed = consumed || result.consumed;
    remainingText = result.remainingText;
  }

  for (const hyperlinkNode of asArray(paragraph["w:hyperlink"])) {
    if (!hyperlinkNode || typeof hyperlinkNode !== "object") {
      continue;
    }

    const hyperlinkRecord = hyperlinkNode as Record<string, unknown>;

    for (const runNode of asArray(hyperlinkRecord["w:r"])) {
      if (!runNode || typeof runNode !== "object") {
        continue;
      }

      const result = setTextNodesOnRun(
        runNode as Record<string, unknown>,
        remainingText
      );
      consumed = consumed || result.consumed;
      remainingText = result.remainingText;
    }
  }

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
