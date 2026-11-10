# [Your Tool Name]

> Brief one-line description of what this tool does.

Built as part of the [AAO Data Lab](https://lab.allaboardohio.org) — open-source tools for passenger rail and connected mobility advocacy.

## Live Site

🔗 [subdomain.lab.allaboardohio.org](https://subdomain.lab.allaboardohio.org)

_(To request a subdomain, post in `#infrastructure` on [Slack](https://join.slack.com/t/lab-allaboardohio/shared_invite/zt-3x7cyvl53-0IQMjvljmA64iNCZvhaP1w) with your repo link and deployment URL.)_

## About

Longer description of the tool, its purpose, and its intended audience.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
git clone https://github.com/all-aboard-ohio/your-repo.git
cd your-repo
npm install
cp .env.example .env.local
# Fill in any required environment variables
npm run dev
```

The dev server starts at `http://localhost:5173`.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_EXAMPLE_TOKEN` | No | Replace with real vars |

Request API keys in `#dev-resources` on Slack.

## Deployment

This project deploys automatically to **GitHub Pages** via GitHub Actions on every push to `main`. See `.github/workflows/deploy.yml`.

If you need a custom subdomain (`yourproject.lab.allaboardohio.org`), request it in `#infrastructure` on Slack.

## Data Sources

- Source 1 — description
- Source 2 — description

## Contributing

See the [AAO Data Lab contributor guide](https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/contributing.md).

Join `#dev-general` on [Slack](https://join.slack.com/t/lab-allaboardohio/shared_invite/zt-3x7cyvl53-0IQMjvljmA64iNCZvhaP1w) to introduce yourself and ask questions.

## License

MIT
