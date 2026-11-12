# All Aboard Ohio Resources

Public passenger-rail resources, practical advocacy materials, and the latest AAO
stories, built as static HTML and JSON from Wix CMS and Wix Blog.

Built with React, Vite, Tailwind CSS, the Wix SDK, and Sharp image optimization.

## Site

[resources.allaboardohio.org](https://resources.allaboardohio.org) is the intended
production domain; GitHub Pages and DNS must be configured before it is live.

GitHub Actions refreshes public CMS data approximately every 15 minutes. Visitors
receive static pages and locally optimized images, with no browser-side CMS calls.
Optional analytics sends directly from consenting browsers to the analytics service.

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

## Privacy And Analytics

The approved `/privacy/` policy and footer Privacy settings control are included.
Wix pageview integration is enabled after AAO's settings review, but tracking is
off for every visitor until explicit acceptance. The accepted scope is resource-site
page views in Wix Analytics, without linking identities to the main site. See
`docs/wix-analytics.md` for the production verification checklist and provider settings.
No optional tracker loads merely because a notice is dismissed.

## Category Pages

Categories have dedicated static pages such as `/analysis/`, `/printables/`,
`/templates/`, `/toolkit/`, and `/onboarding/`, with breadcrumbs, search, sorting
and links to other categories. The Resources menu and homepage category filters
link to these pages. Resources appear under all their assigned categories.

`src/data/categories.js` retains the verified Wix category IDs so empty categories
remain linkable without exposing draft records. New categories discovered through
published resource references are included automatically; register a category here
if it must exist before it has any published resources. Sparse categories show
a coming-soon placeholder without displaying draft content.

## Data Sources

- Wix CMS `Resources`: published public resources and their category references.
- Wix Blog `Blog/Posts`: the three newest published stories, ordered by
	`publishedDate`, with cover images and original `allaboardohio.org/posts/` links.

`npm run sync` exports both sources into the public JSON snapshot. The homepage
places the blog stories between the action and join sections. GitHub Actions
performs the sync on its 15-minute schedule; browsers make no Wix CMS requests.
Optional analytics runs only after a visitor explicitly accepts it.
Blog content changes are included in snapshot change detection. A failed blog
fetch stops deployment rather than replacing the live site with partial data.

## Published Artifacts

Only `dist/` is uploaded to Pages. Build checks reject documentation, test fixtures,
source maps, source files, environment files, caches and unexpected assets. Photo
instructions are in `docs/images.md`, not the public asset directory.

The public route manifest contains published resources only, so withdrawn titles
are not retained there. Paths remain stable while resources are published. If a
withdrawn resource is renamed and later republished, preserving its old path would
require a CMS-managed permanent slug or a separately protected route history;
the site does not publish private route history for that purpose.

Repository visibility is separate from Pages: notes and test source remain visible
to anyone who has access to the repository, even though they are not web assets.

## Accessibility And SEO

Pages use semantic headings and landmarks, labeled navigation and controls, ARIA
for tabs/status/privacy controls, keyboard interactions, skip links and alternative
text for content images. Automated accessibility scans supplement rather than
replace manual accessibility review.

The build generates complete static HTML, individual titles/descriptions,
canonical and social-sharing metadata, `sitemap.xml`, `robots.txt` and a noindex
404 page. The sitemap covers indexable home, category, resource and privacy pages.
After deploying the custom domain, submit its sitemap in Google Search Console
and Bing Webmaster Tools. Metadata and a sitemap do not guarantee search rankings.

## Contributing

See the [AAO Data Lab contributor guide](https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/contributing.md).

Join `#dev-general` on [Slack](https://join.slack.com/t/lab-allaboardohio/shared_invite/zt-3x7cyvl53-0IQMjvljmA64iNCZvhaP1w) to introduce yourself and ask questions.

## License

MIT
