# Taiwan Travel JP Translator

A docx-based translation workspace for Taiwan travel articles. The app keeps the original author's intent intact, then reshapes the Japanese into a warm, Taiwan-savvy editorial voice and adds optional trend-oriented title suggestions.

## Setup

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env.local`
3. Add your `OPENAI_API_KEY` for the default stable path
4. Optional: add `GEMINI_API_KEY` as a fallback provider
5. Run `npm run dev`

## Deploy

Recommended: deploy to `Vercel`.

1. Create a Vercel project from this folder or from a GitHub repository.
2. Add these Environment Variables in Vercel:
   `OPENAI_API_KEY`
   `OPENAI_MODEL` with value `gpt-4o` (avoid `gpt-5.5` + reasoning — far more expensive with no real quality gain here)
   `LLM_PROVIDER_ORDER` with value `openai`
   `GEMINI_API_KEY` if you still want a backup provider
   `GEMINI_MODEL` with value `gemini-2.5-flash` if you want that backup provider
3. Deploy.

After deployment, the app runs on Vercel's servers, so teammates can keep using it even when your computer is asleep.

Notes:
`app/api/analyze/route.ts` and `app/api/translate/route.ts` export `maxDuration = 60` for longer cloud executions.
This app uses your configured model provider keys on the server side. If the URL is shared broadly, usage costs or rate limits will come from those accounts.

## Workflow

1. Upload a `.docx` travel article
2. Run meaning-first Japanese translation
3. Apply strict Japanese polishing
4. Review optional trend suggestions for titles, headings, and SEO copy
5. Download a new `.docx`
