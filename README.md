# Quizzer

Single-page quiz site for running through multiple-choice question sets. Question content is fetched at runtime from a separate, authenticated backend.

Hosted on **Cloudflare Workers** with static assets. The Worker acts as a thin proxy between the browser and the questions backend, hiding the backend URL and authenticating requests with a shared token.

## Architecture

```
Browser ──► /              (static asset: index.html)
        ──► /api/sets?...  ┐
                            ├── Worker proxies to questions backend
        ──► /questions/... ┘   (separate private deployment)
```

The Worker (`src/worker.js`) forwards `/api/sets` and `/questions/*` requests to an authenticated backend specified by two environment secrets:

- `QUESTIONS_URL` — backend's URL (e.g. `https://my-quizzer-questions.example.workers.dev`)
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

## Deploying your own

This app pairs with a [quizzer-questions](https://github.com/j-f-allison/quizzer-questions) backend. The recommended pattern: **fork both repos to private repos**, and deploy from the private forks. This keeps your question content private and keeps your deployment URLs out of any public Git history (Cloudflare's Git integration registers GitHub Deployments visible on whichever repo it's connected to).

### 1. Set up the backend

Follow [quizzer-questions](https://github.com/j-f-allison/quizzer-questions#deploying-your-own)'s deploy instructions. You'll end up with a `SHARED_TOKEN` and a deployed URL like `https://my-quizzer-questions.your-subdomain.workers.dev`.

### 2. Fork this app to a private repo

```bash
# 1. Create a new EMPTY private repo on GitHub (e.g., my-quizzer-app)

# 2. Locally:
git clone git@github.com:j-f-allison/quizzer.git my-quizzer-app
cd my-quizzer-app
git remote remove origin
git remote add origin git@github.com:YOURNAME/my-quizzer-app.git
git remote add upstream git@github.com:j-f-allison/quizzer.git
git push -u origin main
```

### 3. Connect Cloudflare to the private app fork

1. Workers & Pages → Create → Connect to Git → pick your private app fork
2. Settings → Variables and Secrets → add **two** Secrets:
   - `QUESTIONS_URL` = your backend's URL (full URL with `https://`, no trailing slash)
   - `QUESTIONS_TOKEN` = same value as `SHARED_TOKEN` on the backend
3. Trigger a deploy. Visit the live URL, type a code matching one of your question subdirectories, take a quiz.

## Pulling future updates

When this scaffold gets updates, sync them to your private fork:

```bash
cd ~/my-quizzer-app
git fetch upstream
git merge upstream/main
git push
# Cloudflare auto-deploys.
```

## JSON format

See the [quizzer-questions README](https://github.com/j-f-allison/quizzer-questions#json-format) for the full schema.

## Local development

```bash
# create a .dev.vars file pointing at your backend (DO NOT commit)
cat > .dev.vars <<EOF
QUESTIONS_URL=https://my-quizzer-questions.your-subdomain.workers.dev
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
- **Examplified mode** — see below

## Examplified mode

Checking **Examplified** on the start screen runs the same question set through a
reproduction of the ExamSoft/Examplify exam interface, for practising in the UI
the real exam uses. It swaps in a separate full-screen view (`#view-exam`) with:

- the two-row dark exam chrome, left question navigator, stadium answer pills,
  and blue Previous/Next footer
- **free navigation** — go back to any question and change your answer
- **flag for review** — flags show as badges in the navigator; `FILTER` narrows
  the navigator to unanswered or flagged questions
- **cross out answers** — the eye icon on each row dims and strikes a choice
- **highlighter and eraser** — drag over the fact pattern or question to
  highlight; highlights persist for the session
- **Tool Kit panel** — per-question notes, the highlighter/eraser tools, and a
  basic calculator
- **Submit Exam** — the confirmation screen, then the normal results view

Deliberate departures from Examplify: the timer counts **up** (`TIME ELAPSED`)
since Study Hall has no time-limit concept, results *are* shown after
submitting, and Exam Controls has an **Exit without submitting** escape hatch.
Quizzer features with no Examplify equivalent — the progress bar, keyboard
hints, immediate feedback, dark mode, and the content-error flag form — are
hidden in this mode. Content errors can still be reported from the results
screen afterwards.

## Customization

CSS variables are defined at the top of `index.html` inside `:root` (light theme) and `[data-theme="dark"]` (dark theme). All colors flow from there.

The `--ex-*` variables are the exception: they are the Examplified palette and
are intentionally defined only in `:root`, because that mode reproduces an
interface that has no dark theme.
