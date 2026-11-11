# All Aboard Ohio Resources

Public passenger-rail resources, practical advocacy materials, and the latest AAO
stories, built as static HTML and JSON from Wix CMS and Wix Blog.

Built with React, Vite, Tailwind CSS, the Wix SDK, and Sharp image optimization.

## Site

[resources.allaboardohio.org](https://resources.allaboardohio.org) is the intended
production domain; GitHub Pages and DNS must be configured before it is live.

GitHub Actions refreshes public CMS data approximately every 15 minutes. Visitors
receive static pages and locally optimized images, with no browser-side Wix calls.

## Getting Started

### Prerequisites

- Node.js 24 LTS (also used in GitHub Actions)
- npm

### Installation

```bash
git clone https://github.com/all-aboard-ohio/aao-resources-page.git
cd aao-resources-page
npm ci
npm run build
npm run preview
```

The static preview starts at `http://127.0.0.1:4174`. For UI development after the
initial build, use `npm run dev`. Rendering tests use a fixed test-only snapshot;
production builds always use the current public Wix export.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `WIX_CLIENT_ID` | No | Public Wix Headless client ID; defaults to the verified AAO client |
| `PREVIOUS_ROUTES_URL` | No | Previous deployed route manifest, supplied automatically by Actions |

No Wix secret is required for public resource/blog reads. Set optional variables
in the shell or Actions configuration; do not expose secrets using `VITE_` names.

## Deployment

This project deploys automatically to **GitHub Pages** via GitHub Actions on every push to `main`. See `.github/workflows/deploy.yml`.

The workflow also syncs content approximately every 15 minutes and supports manual
runs. Unchanged scheduled snapshots skip deployment. `npm run build:static`
resizes CMS/blog preview images to 320/640/960px WebP files served by Pages, with
responsive image selection in the browser. Actions caches the generated variants;
original images remain in Wix. Preview assets are rebuilt, not committed.

Before the first deployment:

1. Commit and push the implementation and lockfile to `main`.
2. Set repository **Settings > Pages > Source** to **GitHub Actions** and ensure
	Actions and the `github-pages` deployment environment are allowed to run.
3. Configure the custom domain `resources.allaboardohio.org` in Pages, and its DNS
	CNAME to `all-aboard-ohio.github.io`. Verify organization domain ownership as
	appropriate; enable HTTPS after DNS and certificate provisioning complete.
4. Run the workflow manually and review the successful `github-pages` deployment.

Public Wix visitor reads require no secret. `WIX_CLIENT_ID` can optionally be set
as a repository variable. Never place secrets in `VITE_` variables. If migrating
an existing Pages deployment that has no route manifest, use the manual workflow's
`bootstrap_routes` option once; normal runs preserve routes from the last successful
deployment. A failed fetch, image optimization, test or build prevents deployment.

Local static verification: `npm test`, `npm run lint`, `npm run build`, then
`npm run preview`. Set `PORT` if 4174 is already occupied.

## Category Pages

Categories have dedicated static pages such as `/analysis/`, `/printables/`,
`/templates/`, `/toolkit/`, and `/onboarding/`, with breadcrumbs, search, sorting
and links to other categories. The Resources menu and homepage category filters
link to these pages. Resources appear under all their assigned categories.

`src/data/categories.js` retains the verified Wix category IDs so empty categories
remain linkable without exposing draft records. New categories discovered through
published resource references are included automatically; register a category here
if it must exist before it has any published resources. Empty Printables currently
reflects the fiscal-analysis record being in draft.

## Data Sources

- Wix CMS `Resources`: published public resources and their category references.
- Wix Blog `Blog/Posts`: the three newest published stories, ordered by
	`publishedDate`, with cover images and original `allaboardohio.org/posts/` links.

`npm run sync` exports both sources into the public JSON snapshot. The homepage
places the blog stories between the action and join sections. GitHub Actions
performs the sync on its 15-minute schedule; browsers make no Wix API requests.
Blog content changes are included in snapshot change detection. A failed blog
fetch stops deployment rather than replacing the live site with partial data.

## Contributing

See the [AAO Data Lab contributor guide](https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/contributing.md).

Join `#dev-general` on [Slack](https://join.slack.com/t/lab-allaboardohio/shared_invite/zt-3x7cyvl53-0IQMjvljmA64iNCZvhaP1w) to introduce yourself and ask questions.

## License

MIT
