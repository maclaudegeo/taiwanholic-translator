# TaiwanHolic 翻譯小秘書交接文件

這份文件是給工程同事的技術交接版，目標是讓另一位同事可以：

1. 在本機跑起同一個程式
2. 理解目前功能與流程
3. 重新部署到自己的 Vercel / GitHub
4. 需要時直接延伸或重做同類型工具

## 專案定位

這是一個給中文使用者操作的旅遊文章翻譯工具。

主要用途：

1. 上傳中文 `.docx` 文章
2. 系統先分析文章，整理出日文關鍵字建議
3. 使用者勾選想保留的關鍵字
4. 系統把全文翻成日文，語氣會盡量靠近 `Howto Taiwan` 類型的日文旅遊媒體寫法
5. 產出 3 個日文標題建議
6. 關鍵字與標題建議都會附上中文意思
7. 最後下載為新的 `.docx`

## Repository

- GitHub Repository: [maclaudegeo/taiwanholic-translator](https://github.com/maclaudegeo/taiwanholic-translator)
- 建議部署網址：Vercel

## 技術架構

- Framework: Next.js 15
- UI: React 19
- 語言: TypeScript
- LLM: OpenAI 為主，Gemini 可作為 fallback
- 文件解析: `jszip` + `fast-xml-parser`
- 文件匯出: `docx` + 直接回填原始 `document.xml`
- 趨勢關鍵字: `google-trends-api`
- Schema 驗證: `zod`
- 測試: `vitest` + `@testing-library/react`

## 目前使用者流程

### 1. 上傳文章

前端元件：

- [components/upload-form.tsx](/Users/mataiwan/Documents/Codex/翻譯/components/upload-form.tsx)

後端 API：

- [app/api/analyze/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/analyze/route.ts)

做的事：

1. 接收 `.docx`
2. 解析出 Word 內文段落
3. 依段落判斷是標題、內文、小標、caption、SEO 描述
4. 送去做關鍵字分析

### 2. 關鍵字分析

主要檔案：

- [lib/docx-parser.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/docx-parser.ts)
- [lib/trends.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/trends.ts)
- [lib/translation-pipeline.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/translation-pipeline.ts)
- [components/notes-pane.tsx](/Users/mataiwan/Documents/Codex/翻譯/components/notes-pane.tsx)

邏輯：

1. 先抓文章核心詞
2. 如果有開啟 Google Trends，就補抓日本旅遊搜尋語
3. 交給模型整理成「日文關鍵字」
4. 每個關鍵字會回傳：
   - `phrase`: 日文關鍵字
   - `phraseZh`: 中文意思
   - `reason`: 日文理由
   - `source`: `article_core` / `google_trends` / `manual`
   - `selected`: 是否預設勾選

前端顯示時：

1. 會分成文章核心、Google Trends、手動新增
2. 顯示日文
3. 顯示中文意思
4. 顯示中文化後的用途說明

### 3. 文章翻譯

主要檔案：

- [app/api/translate/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/translate/route.ts)
- [lib/prompts.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/prompts.ts)
- [lib/editorial-rules.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/editorial-rules.ts)
- [lib/openai.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/openai.ts)
- [lib/translation-chunks.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/translation-chunks.ts)
- [lib/translation-pipeline.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/translation-pipeline.ts)

邏輯：

1. 文章先切 chunk，避免太長超時
2. 每個 chunk 只做一次 bulk translation
3. 保留原文意思
4. 日文語氣偏向 TaiwanHolic / Howto Taiwan 類型的旅遊媒體寫法
5. 選到的關鍵字只在自然的地方插入，不做硬塞

### 4. 標題建議

主要檔案：

- [app/api/titles/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/titles/route.ts)
- [components/result-pane.tsx](/Users/mataiwan/Documents/Codex/翻譯/components/result-pane.tsx)

目前會回傳 3 組標題，每組有：

- `text`: 日文標題
- `textZh`: 中文意思
- `focus`: 標題方向
- `keywordsUsed`: 用到哪些關鍵字

前端會讓使用者：

1. 看日文標題
2. 看中文意思
3. 選一個標題
4. 或手動輸入自己的日文標題

### 5. 匯出 docx

主要檔案：

- [app/api/export/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/export/route.ts)
- [lib/docx-exporter.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/docx-exporter.ts)

這邊做兩件事：

1. 優先直接回填原始上傳檔的 `word/document.xml`
2. 如果失敗，再 fallback 重新產一份 docx

這樣做的目的，是盡量保留原本文章裡的圖片、版型、段落順序。

## 重要型別

定義檔：

- [lib/article-blocks.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/article-blocks.ts)

目前最重要的資料結構：

### `ArticleBlock`

代表文章中的一段內容。

欄位包含：

- `id`
- `type`
- `sourceText`
- `translatedText`
- `polishedText`
- `trendSuggestions`
- `notes`

### `KeywordSuggestion`

- `phrase`
- `phraseZh`
- `source`
- `reason`
- `selected`

### `TitleOption`

- `id`
- `label`
- `text`
- `textZh`
- `focus`
- `keywordsUsed`

## 環境變數

本機與 Vercel 至少要有：

```env
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o
LLM_PROVIDER_ORDER=openai
```

如果想保留 Gemini fallback，可以再加：

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
LLM_PROVIDER_ORDER=openai,gemini
```

目前建議最穩定做法：

```env
LLM_PROVIDER_ORDER=openai
```

原因：

1. Gemini 免費額度與高峰 503 比較常發生
2. OpenAI 在這個專案的 structured output 比較穩
3. 長文翻譯成功率目前 OpenAI 較高

## 本機啟動

```bash
npm install
npm run dev
```

打開：

- [http://localhost:3000](http://localhost:3000)

## 測試與 build

### 跑全部測試

```bash
npm test
```

### 跑正式 build

```bash
npm run build
```

目前至少要確認這兩個都過。

## 重要限制

### 1. Vercel 執行時間

目前：

- `analyze` route `maxDuration = 60`
- `translate` route `maxDuration = 300`

但實際上如果文章太長、模型太慢，還是可能超時。

所以現在的穩定做法是：

1. 前端先切 chunk
2. 每個 chunk 分批呼叫 `/api/translate`

### 2. 關鍵字與標題一定要走 structured output

因為前端依賴固定 schema。

如果改 prompt，記得同步檢查：

- [lib/translation-pipeline.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/translation-pipeline.ts)
- [app/api/translate/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/translate/route.ts)
- [app/api/titles/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/titles/route.ts)

### 3. 手動新增關鍵字目前預設中文意思 = 原字串

在這種情況下：

- 如果使用者手動加的是日文，中文意思暫時會先直接顯示同一串字
- 如果要更完整，可以未來再加一個小翻譯步驟，把手動詞也翻成中文

目前是為了穩定與速度，先不多打一個 API。

## 如果另一個同事要重做同一個程式，可不可以？

可以，而且不難。

最少只要保留這 5 塊：

1. `.docx` 解析
2. 關鍵字分析
3. 分段翻譯
4. 標題建議
5. `.docx` 匯出

如果他想重做成別的介面，核心其實只要搬這幾個檔案邏輯：

- [lib/docx-parser.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/docx-parser.ts)
- [lib/docx-exporter.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/docx-exporter.ts)
- [lib/translation-pipeline.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/translation-pipeline.ts)
- [lib/openai.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/openai.ts)
- [lib/prompts.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/prompts.ts)
- [lib/editorial-rules.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/editorial-rules.ts)

也就是說：

- 前端可以重做
- 視覺可以重做
- 但這些核心模組直接沿用最快

## 建議交接順序

如果你要把這個專案交給另一位工程同事，建議他先照這個順序讀：

1. [README.md](/Users/mataiwan/Documents/Codex/翻譯/README.md)
2. [components/translator-app.tsx](/Users/mataiwan/Documents/Codex/翻譯/components/translator-app.tsx)
3. [app/api/analyze/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/analyze/route.ts)
4. [app/api/translate/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/translate/route.ts)
5. [app/api/titles/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/titles/route.ts)
6. [app/api/export/route.ts](/Users/mataiwan/Documents/Codex/翻譯/app/api/export/route.ts)
7. [lib/translation-pipeline.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/translation-pipeline.ts)
8. [lib/prompts.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/prompts.ts)
9. [lib/openai.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/openai.ts)
10. [lib/docx-parser.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/docx-parser.ts)
11. [lib/docx-exporter.ts](/Users/mataiwan/Documents/Codex/翻譯/lib/docx-exporter.ts)

## 未來可以再加的功能

1. 手動新增關鍵字時，自動補中文翻譯
2. 顯示更精準的「關鍵字放在哪裡比較適合」
3. 文章下載時可選 `.docx` / `.md`
4. 加入「重新生成標題」按鈕
5. 加入「只重翻某一段」功能
6. 顯示文章的日文 SEO description 單獨複製區

## 結論

這個專案已經不是 demo，而是可交接、可部署、可延伸的正式工具。

另一位同事如果想做出同一個程式：

- 可以直接接這個 repo 繼續做
- 也可以照這份文件把同一套流程重做出來

如果只是要最快複製一份給另一個團隊使用，最簡單做法不是重寫，而是：

1. fork 這個 repo
2. 換自己的 API key
3. 重新部署到自己的 Vercel

這樣最快。
