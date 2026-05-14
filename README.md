# Quizzer

Single-page quiz site for running through multiple-choice question sets. Question content is fetched at runtime from a separate, authenticated backend.

Hosted on **Cloudflare Workers** with static assets. The Worker acts as a thin proxy between the browser and the questions backend, hiding the backend URL and authenticating requests with a shared token.

## Architecture

```
Browser ──► /              (static asset: index.html)
        ──► /api/sets?...  ┐
                            ├── Worker proxies to questions backend
        ──► /questions/... ┘   (private repo, separate deployment)
```

The Worker (`src/worker.js`) forwards `/api/sets` and `/questions/*` requests to an authenticated backend specified by two environment secrets:

- `QUESTIONS_URL` — backend's URL (e.g. `https://quizzer-questions.example.workers.dev`)
- `QUESTIONS_TOKEN` — bearer token shared with the backend

Everything else is served from this repo as static assets. No question content lives in this repo.

## Repo layout

```
.
├── index.html           # entire frontend (HTML + CSS + JS in one file)
├── src/
│   └── worker.js        # proxy to the questions backend
├── wrangler.jsonc       # Cloudflare deploy config
├── .assetsignore        # files NOT served as static assets
└── .gitignore
```

## Cloudflare setup

Connect this repo to a Cloudflare Workers project. The default build/deploy settings work — no Python or build step needed in this repo.

**Environment secrets** (Settings → Variables and Secrets, set as **Secret**, not plain variable):

| Name | Value |
| --- | --- |
| `QUESTIONS_URL` | Full URL of your questions backend, no trailing slash |
| `QUESTIONS_TOKEN` | Random 32+ character string, matching `SHARED_TOKEN` in the backend project |

Every push to `main` triggers a redeploy.

## Setting up your own backend

This app needs a paired backend that holds the question content. See [quizzer-questions](https://github.com/j-f-allison/quizzer-questions) for the backend code and setup instructions.

To use this app with your own content:

1. Fork [quizzer-questions](https://github.com/j-f-allison/quizzer-questions) (keep it private)
2. Replace the contents of `questions/` with your own JSON files
3. Deploy it as a Cloudflare Worker
4. Generate a shared token: `openssl rand -hex 32`
5. Set `SHARED_TOKEN` in the backend's Cloudflare project
6. Set `QUESTIONS_URL` and `QUESTIONS_TOKEN` (same token) in this app's Cloudflare project
7. Push both repos and let Cloudflare deploy

## JSON format

Each question file is either a bare array of question objects, or an object wrapping one:

```json
[
  {
    "facts": "Optional. Multi-paragraph fact pattern shown above the question.\n\nParagraphs separated by \\n\\n.",
    "question": "Under UCC § 2-207, ...",
    "option_a": "...",
    "option_b": "...",
    "option_c": "...",
    "option_d": "...",
    "answer": "B",
    "answer_explanation": "Optional. Empty string if no feedback."
  }
]
```

The runtime parser is forgiving:
- Top-level can be `[...]`, `{"questions": [...]}`, `{"data": [...]}`, or `{"items": [...]}`
- Alternate keys: `option_a` / `optionA` / `a`, `question` / `q` / `prompt`, `answer_explanation` / `explanation` / `rationale`, `facts` / `fact` / `scenario`
- The `answer` field accepts `"A"`, `"a"`, `"A."`, `"option_a"`, etc.

For multi-code files or display name overrides, use the wrapper format with `_codes`, `_code`, `_name`. Codes are normally derived from the questions backend's subdirectory structure (see the backend's README).

## Local development

You'll need [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
# create a .dev.vars file pointing at your backend (DO NOT commit)
cat > .dev.vars <<EOF
QUESTIONS_URL=https://quizzer-questions.your-subdomain.workers.dev
QUESTIONS_TOKEN=your-token-here
EOF

# run locally
npx wrangler dev
```

The local dev server proxies to your production backend. To develop both repos locally simultaneously, run the backend on a separate port (`wrangler dev --port 8788`) and point `QUESTIONS_URL` at `http://localhost:8788`.

A plain `python3 -m http.server` will serve the static files but the API calls will 404 — fine for visual testing only.

## Features

- **Code-gated set lookup** — type a code to see matching sets
- **Multi-set quizzes** — pick any combination; questions get pooled
- **Facts patterns** — optional `facts` field renders above the question
- **Review mode** — see answers at the end (default) or after each question
- **Shuffle** — randomize question order
- **Timer** — counts up from start
- **Dark mode** — toggle in top-right corner, persists across sessions
- **Keyboard shortcuts** — `A` / `B` / `C` / `D` to select, `Enter` to submit/advance
- **File upload** — drop a JSON file directly to use without going through the backend

## Customization

CSS variables are defined at the top of `index.html` inside `:root` (light theme) and `[data-theme="dark"]` (dark theme). All colors flow from there.
