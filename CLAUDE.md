# CLAUDE.md — AAO Data Lab Tool

This repo is an **AAO Data Lab web tool** built with React + Vite + Tailwind CSS. Use this file for context when working on any task in this codebase.

## Repo Layout

```
src/
  components/   # Shared UI components
  features/     # Feature-specific modules
  data/         # Static data, constants, mock fixtures
  hooks/        # Shared React hooks
  utils/        # Pure utility functions
  App.jsx       # Root — includes required AAO components
  main.jsx
index.html           # Loads AAO banner CDN script
tailwind.config.js   # AAO design tokens
.github/workflows/deploy.yml  # GitHub Pages deploy
```

## Required in Every Build

`App.jsx` must always contain:

```jsx
<aao-site-header mode="compact" dev-url="https://lab.allaboardohio.org"></aao-site-header>
<aao-notification
  config-url="https://raw.githubusercontent.com/all-aboard-ohio/aao-lab-components/main/banner.json"
></aao-notification>
```

If using paid cloud infrastructure, also include `<aao-donation></aao-donation>`.

## Key Constraints

- No personal data collection, no analytics trackers
- WCAG 2.1 AA minimum — test with axe DevTools before PRs
- Use AAO Tailwind token classes (`aao-dark-blue`, `aao-dark-red`, etc.) — never raw hex
- Mobile-first with Tailwind breakpoints
- Prefer static / client-side over server-side

## Task Playbooks

**Adding a new component:**
1. Create `src/components/ComponentName.jsx`
2. Use `font-heading` for headings, `font-body` for text, AAO color tokens
3. Add `aria-label` or semantic HTML for accessibility

**Changing data / content:**
- Static data lives in `src/data/`
- If data is fetched, keep fetch logic in a custom hook in `src/hooks/`

**Deploying:**
- Push to `main` → GitHub Actions builds and deploys to GitHub Pages automatically
- Check `.github/workflows/deploy.yml` for configuration
- To use a custom subdomain, request it in `#infrastructure` on Slack

## Reference Docs

- Mission & ethos: https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/mission-ethos.md
- Style guide: https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/style-guide.md
- Requirements: https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/requirements.md
- Architecture: https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/architecture.md
- Contributing: https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/contributing.md
