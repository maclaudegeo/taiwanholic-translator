import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import type { ArticleBlock, BlockType } from "./article-blocks";

type RawParagraph = {
  text: string;
  styleName?: string | null;
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: ""
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

function getTextFromRuns(runNodes: unknown[]): string {
  return runNodes
    .flatMap((runNode) => {
      if (!runNode || typeof runNode !== "object") {
        return [];
      }

      const runRecord = runNode as Record<string, unknown>;
      const textNodes = asArray(runRecord["w:t"]);
      return textNodes.map(extractText);
    })
    .join("");
}

function detectBlockType(
  styleName: string | null | undefined,
  text: string,
  index: number,
): BlockType {
  const normalizedStyle = styleName?.toLowerCase() ?? "";
  const normalizedText = text.toLowerCase();

  if (
    normalizedStyle.includes("seo") ||
    normalizedStyle.includes("meta") ||
    normalizedText.startsWith("seo:")
  ) {
    return "seo_description";
  }

  if (normalizedStyle.includes("caption")) {
    return "caption";
  }

  if (
    normalizedStyle.includes("title") ||
    (index === 0 && !normalizedStyle.includes("heading"))
  ) {
    return "title";
  }

  if (
    normalizedStyle.includes("heading") ||
    normalizedStyle.includes("subtitle") ||
    normalizedStyle.includes("見出し")
  ) {
    return "heading";
  }

  return "paragraph";
}

export function parseRawParagraphs(paragraphs: RawParagraph[]): ArticleBlock[] {
  return paragraphs.flatMap((paragraph, index) => {
    const trimmed = paragraph.text.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      return [];
    }

    const type = detectBlockType(paragraph.styleName, trimmed, index);
    return [
      {
        id: `${type}-${index + 1}`,
        type,
        sourceText: trimmed,
        translatedText: null,
        polishedText: null,
        trendSuggestions: [],
        notes: []
      }
    ];
  });
}

function buildStyleMap(stylesXml: string | undefined) {
  if (!stylesXml) {
    return new Map<string, string>();
  }

  const stylesDoc = xmlParser.parse(stylesXml) as Record<string, unknown>;
  const stylesRoot = stylesDoc["w:styles"] as Record<string, unknown> | undefined;
  const styleNodes = asArray(stylesRoot?.["w:style"]);
  const styles = new Map<string, string>();

  for (const node of styleNodes) {
    if (!node || typeof node !== "object") {
      continue;
    }

    const record = node as Record<string, unknown>;
    const styleId = typeof record["w:styleId"] === "string" ? record["w:styleId"] : null;
    const nameNode = record["w:name"] as Record<string, unknown> | undefined;
    const styleName =
      typeof nameNode?.["w:val"] === "string" ? nameNode["w:val"] : styleId;

    if (styleId && styleName) {
      styles.set(styleId, styleName);
    }
  }

  return styles;
}

export async function parseDocxBuffer(buffer: ArrayBuffer | Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("text");

  if (!documentXml) {
    throw new Error("The uploaded file does not contain a Word document body.");
  }

  const stylesXml = await zip.file("word/styles.xml")?.async("text");
  const styleMap = buildStyleMap(stylesXml);
  const documentDoc = xmlParser.parse(documentXml) as Record<string, unknown>;
  const body = (documentDoc["w:document"] as Record<string, unknown>)?.[
    "w:body"
  ] as Record<string, unknown> | undefined;

  const paragraphs = asArray(body?.["w:p"]).map((paragraphNode) => {
    const paragraph = paragraphNode as Record<string, unknown>;
    const paragraphProperties = paragraph["w:pPr"] as Record<string, unknown> | undefined;
    const styleNode = paragraphProperties?.["w:pStyle"] as Record<string, unknown> | undefined;
    const styleId =
      typeof styleNode?.["w:val"] === "string" ? styleNode["w:val"] : undefined;

    const text = [
      getTextFromRuns(asArray(paragraph["w:r"])),
      ...asArray(paragraph["w:hyperlink"]).map((hyperlinkNode) =>
        getTextFromRuns(
          asArray((hyperlinkNode as Record<string, unknown>)["w:r"]),
        ),
      )
    ]
      .join("")
      .trim();

    return {
      text,
      styleName: styleId ? styleMap.get(styleId) ?? styleId : undefined
    };
  });

  return parseRawParagraphs(paragraphs);
}
