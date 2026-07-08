# Taiwan Travel JP Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that uploads a `.docx` travel article, translates it into natural Japanese while preserving the original meaning, runs strict Japanese polishing, suggests optional Japan-market trend keywords for titles and SEO fields, previews the results, and exports a new `.docx`.

**Architecture:** Use a single Next.js App Router project with a server-side translation API. Keep document parsing, prompting, trend suggestion, and `.docx` export in focused `lib/` modules so each stage can be tested in isolation. Run the AI flow in three stages per article block: translation, polishing, then optional trend suggestion.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Testing Library, OpenAI Node SDK via Responses API, Mammoth for `.docx` import, `docx` for export, Zod for schemas.

---

### Task 1: Scaffold the app and toolchain

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `tests/smoke/app-shell.test.tsx`

- [ ] **Step 1: Write the failing app shell test**

```tsx
import { render, screen } from "@testing-library/react";
import HomePage from "../../app/page";

describe("HomePage", () => {
  it("renders the translator workspace shell", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /Taiwan Travel JP Translator/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Upload a docx travel article/i),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/smoke/app-shell.test.tsx`  
Expected: FAIL because project files and test config do not exist yet.

- [ ] **Step 3: Create the minimal project files**

```json
{
  "name": "taiwan-travel-jp-translator",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  }
}
```

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>Taiwan Travel JP Translator</h1>
      <p>Upload a docx travel article to translate it into natural Japanese.</p>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/smoke/app-shell.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts vitest.setup.ts .gitignore app/layout.tsx app/page.tsx app/globals.css tests/smoke/app-shell.test.tsx
git commit -m "feat: scaffold translator app shell"
```

### Task 2: Implement document models, parser, and exporter

**Files:**
- Create: `lib/article-blocks.ts`
- Create: `lib/docx-parser.ts`
- Create: `lib/docx-exporter.ts`
- Create: `tests/lib/docx-parser.test.ts`
- Create: `tests/lib/docx-exporter.test.ts`
- Create: `tests/fixtures/sample-article.ts`

- [ ] **Step 1: Write the failing parser and exporter tests**

```ts
import { describe, expect, it } from "vitest";
import { parseRawParagraphs } from "../../lib/docx-parser";
import { buildDocxBuffer } from "../../lib/docx-exporter";

describe("parseRawParagraphs", () => {
  it("maps heading styles and body text into ordered article blocks", () => {
    const blocks = parseRawParagraphs([
      { text: "台北早餐推薦", styleName: "Title" },
      { text: "先從台灣早晨開始。", styleName: "Normal" },
      { text: "阜杭豆漿", styleName: "Heading 2" },
    ]);

    expect(blocks.map((block) => block.type)).toEqual([
      "title",
      "paragraph",
      "heading",
    ]);
  });
});

describe("buildDocxBuffer", () => {
  it("creates a docx buffer from polished article blocks", async () => {
    const buffer = await buildDocxBuffer([
      {
        id: "title-1",
        type: "title",
        sourceText: "台北早餐推薦",
        translatedText: "台北朝ごはんガイド",
        polishedText: "台北で味わいたい朝ごはん案内",
        trendSuggestions: [],
        notes: [],
      },
    ]);

    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/docx-parser.test.ts tests/lib/docx-exporter.test.ts`  
Expected: FAIL because the parser and exporter modules do not exist yet.

- [ ] **Step 3: Implement the block schema, parser, and exporter**

```ts
export type BlockType =
  | "title"
  | "seo_description"
  | "heading"
  | "paragraph"
  | "caption";

export type ArticleBlock = {
  id: string;
  type: BlockType;
  sourceText: string;
  translatedText: string | null;
  polishedText: string | null;
  trendSuggestions: string[];
  notes: string[];
};
```

```ts
export function parseRawParagraphs(
  paragraphs: Array<{ text: string; styleName?: string | null }>,
): ArticleBlock[] {
  return paragraphs
    .map(({ text, styleName }, index) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return null;
      }

      const type =
        styleName === "Title"
          ? "title"
          : styleName?.startsWith("Heading")
            ? "heading"
            : "paragraph";

      return {
        id: `${type}-${index + 1}`,
        type,
        sourceText: trimmed,
        translatedText: null,
        polishedText: null,
        trendSuggestions: [],
        notes: [],
      };
    })
    .filter((block): block is ArticleBlock => block !== null);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/docx-parser.test.ts tests/lib/docx-exporter.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/article-blocks.ts lib/docx-parser.ts lib/docx-exporter.ts tests/lib/docx-parser.test.ts tests/lib/docx-exporter.test.ts tests/fixtures/sample-article.ts
git commit -m "feat: add docx parser and exporter"
```

### Task 3: Implement prompt builders and AI pipeline

**Files:**
- Create: `lib/editorial-rules.ts`
- Create: `lib/prompts.ts`
- Create: `lib/openai.ts`
- Create: `lib/translation-pipeline.ts`
- Create: `tests/lib/prompts.test.ts`
- Create: `tests/lib/translation-pipeline.test.ts`

- [ ] **Step 1: Write the failing prompt and pipeline tests**

```ts
import { describe, expect, it, vi } from "vitest";
import { buildTranslationPrompt } from "../../lib/prompts";
import { translateArticleBlocks } from "../../lib/translation-pipeline";

describe("buildTranslationPrompt", () => {
  it("includes the fidelity rule and Taiwan-friend editorial tone", () => {
    const prompt = buildTranslationPrompt({
      blockType: "title",
      sourceText: "台北早餐推薦",
    });

    expect(prompt).toContain("preserve the original meaning");
    expect(prompt).toContain("a trusted Taiwan-savvy friend");
  });
});

describe("translateArticleBlocks", () => {
  it("runs translation, polishing, then trend suggestion in order", async () => {
    const callModel = vi
      .fn()
      .mockResolvedValueOnce({
        text: JSON.stringify({ text: "台北の朝ごはん案内", notes: [] }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ text: "台北で楽しむ朝ごはん案内", notes: ["polished"] }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({ suggestions: ["台湾 朝ごはん"], notes: [] }),
      });

    const result = await translateArticleBlocks(
      [
        {
          id: "title-1",
          type: "title",
          sourceText: "台北早餐推薦",
          translatedText: null,
          polishedText: null,
          trendSuggestions: [],
          notes: [],
        },
      ],
      { callModel, includeTrendSuggestions: true },
    );

    expect(callModel).toHaveBeenCalledTimes(3);
    expect(result[0].polishedText).toBe("台北で楽しむ朝ごはん案内");
    expect(result[0].trendSuggestions).toEqual(["台湾 朝ごはん"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/lib/prompts.test.ts tests/lib/translation-pipeline.test.ts`  
Expected: FAIL because the prompt and pipeline modules do not exist yet.

- [ ] **Step 3: Implement the prompt builders and OpenAI wrapper**

```ts
export function buildTranslationPrompt(input: {
  blockType: string;
  sourceText: string;
}) {
  return [
    "Preserve the original meaning, facts, and emphasis.",
    "Write in natural Japanese for readers who love Taiwan.",
    "Adopt the tone of a trusted Taiwan-savvy friend, not a hard-sell ad.",
    `Block type: ${input.blockType}`,
    `Source text: ${input.sourceText}`,
  ].join("\n");
}
```

```ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function callResponsesModel(input: {
  instructions: string;
  prompt: string;
}) {
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5.5",
    reasoning: { effort: "low" },
    instructions: input.instructions,
    input: input.prompt,
  });

  return { text: response.output_text };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/lib/prompts.test.ts tests/lib/translation-pipeline.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/editorial-rules.ts lib/prompts.ts lib/openai.ts lib/translation-pipeline.ts tests/lib/prompts.test.ts tests/lib/translation-pipeline.test.ts
git commit -m "feat: add translation pipeline"
```

### Task 4: Build the upload, preview, and download flow

**Files:**
- Create: `app/api/translate/route.ts`
- Create: `app/api/export/route.ts`
- Create: `components/upload-form.tsx`
- Create: `components/result-pane.tsx`
- Create: `components/notes-pane.tsx`
- Modify: `app/page.tsx`
- Create: `tests/app/translate-route.test.ts`

- [ ] **Step 1: Write the failing route and UI integration tests**

```ts
import { describe, expect, it } from "vitest";
import { POST } from "../../app/api/translate/route";

describe("POST /api/translate", () => {
  it("rejects requests without a docx file", async () => {
    const request = new Request("http://localhost/api/translate", {
      method: "POST",
      body: new FormData(),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

```tsx
expect(
  screen.getByRole("button", { name: /Translate article/i }),
).toBeInTheDocument();
expect(screen.getByText(/Polishing notes/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/app/translate-route.test.ts tests/smoke/app-shell.test.tsx`  
Expected: FAIL because the routes and UI components are not implemented yet.

- [ ] **Step 3: Implement the API routes and page layout**

```ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "A .docx file is required." }, { status: 400 });
  }

  // Parse, translate, and return structured blocks.
}
```

```tsx
export default function HomePage() {
  return (
    <main className="page-shell">
      <UploadForm />
      <ResultPane />
      <NotesPane />
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/app/translate-route.test.ts tests/smoke/app-shell.test.tsx`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/translate/route.ts app/api/export/route.ts components/upload-form.tsx components/result-pane.tsx components/notes-pane.tsx app/page.tsx tests/app/translate-route.test.ts
git commit -m "feat: add translator workflow UI"
```

### Task 5: Verify the full workflow and developer experience

**Files:**
- Create: `.env.example`
- Create: `README.md`
- Modify: `app/globals.css`
- Modify: `package.json`

- [ ] **Step 1: Write the failing documentation and smoke assertions**

```ts
expect(screen.getByText(/Trend suggestions are optional/i)).toBeInTheDocument();
expect(screen.getByRole("button", { name: /Download docx/i })).toBeDisabled();
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/smoke/app-shell.test.tsx`  
Expected: FAIL because the final UI copy and disabled download state are not in place yet.

- [ ] **Step 3: Add final polish, docs, and env setup**

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
```

```md
# Taiwan Travel JP Translator

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Run `npm run dev`
```

- [ ] **Step 4: Run full verification**

Run: `npm test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add .env.example README.md app/globals.css package.json
git commit -m "docs: finalize translator setup"
```
