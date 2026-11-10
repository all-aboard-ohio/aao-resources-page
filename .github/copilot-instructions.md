---
applyTo: "**"
---

# GitHub Copilot Instructions — AAO Data Lab Tool

This repo is an **AAO Data Lab web tool** — part of the open-source civic tech platform at [lab.allaboardohio.org](https://lab.allaboardohio.org). Replace this header with your tool name when using this template.

## Mission

We build interactive tools that help advocates, officials, and the public make the case for passenger rail and connected transit in Ohio and beyond. Tools focus on economics and quality of life — commute times, job access, housing costs, and the fiscal impact of a connected network.

Full context → [mission-ethos.md](https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/mission-ethos.md)

## Stack

React 19 + Vite + Tailwind CSS. Design tokens and fonts are pre-configured in `tailwind.config.js`.

## Required Components (Do Not Remove)

Every deployed AAO tool must include these in the root layout:

```jsx
<aao-site-header mode="compact" dev-url="https://lab.allaboardohio.org"></aao-site-header>
<aao-notification
  config-url="https://raw.githubusercontent.com/all-aboard-ohio/aao-lab-components/main/banner.json"
></aao-notification>
```

If the project uses paid cloud infrastructure (Google Cloud), also add:

```jsx
<aao-donation></aao-donation>
```

Source: [aao-lab-components](https://github.com/all-aboard-ohio/aao-lab-components)

## Design Tokens (Tailwind)

| Class | Hex | Use |
|---|---|---|
| `aao-dark-blue` | #012345 | Headings, primary backgrounds |
| `aao-dark-red` | #B72717 | Accents, CTAs |
| `aao-light-blue` | #388CBB | Links, hover states |
| `aao-beige` | #FBF3E3 | Alternate section backgrounds |

Fonts: `font-heading` (Poppins) · `font-body` (Montserrat). Always use token classes, never raw hex.

Full guide → [style-guide.md](https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/style-guide.md)

## Standards

- **Mobile-first** — Tailwind `sm:` / `md:` / `lg:` breakpoints
- **Accessibility** — WCAG 2.1 AA minimum; semantic HTML, ARIA where needed; run axe DevTools before every PR
- **Privacy** — no personal data collection, no third-party analytics trackers, ever
- **Components** — small and focused; props over global state for simple trees
- **Deployment** — prefer GitHub Pages; Google Cloud only if a database or backend is truly required

Full requirements → [requirements.md](https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/requirements.md)  
Full architecture → [architecture.md](https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/architecture.md)

## Contributing

Branch naming: `feature/`, `fix/`, `docs/`, `chore/`  
Commits: `feat|fix|docs|style|refactor|test|chore(<scope>): <description>`  
PRs require: linked issue, description of change, screenshot if UI changed.

Full guide → [contributing.md](https://github.com/all-aboard-ohio/aao-lab-docs/blob/main/contributing.md)
