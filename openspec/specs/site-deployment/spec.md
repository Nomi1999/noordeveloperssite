## Purpose

Publishes the site to GitHub Pages under the noordevelopers.pk domain automatically, so every change to the main branch goes live without manual steps.

## Requirements

### Requirement: Automated deploy on main
Every push to the main branch SHALL build the site and publish it to GitHub Pages. A failed build SHALL NOT replace the live site.

#### Scenario: Successful push
- **WHEN** a commit that builds successfully is pushed to main
- **THEN** the new version is live on GitHub Pages without manual steps

#### Scenario: Broken build
- **WHEN** a commit that fails to build is pushed to main
- **THEN** the workflow fails visibly and the previously deployed version stays live

### Requirement: Manual deploy trigger
The deploy workflow SHALL also be startable manually from the repository's Actions page.

#### Scenario: Manual redeploy
- **WHEN** the maintainer runs the workflow manually
- **THEN** the current main branch is built and deployed

### Requirement: Custom domain
The published site SHALL include a `CNAME` file containing `noordevelopers.pk`, and all internal links and asset URLs SHALL work at the domain root without a base path.

#### Scenario: Assets at domain root
- **WHEN** the site is served from `https://noordevelopers.pk/`
- **THEN** every page, stylesheet, script, font and image loads without 404 errors

### Requirement: Works at the GitHub Pages project address
The deploy SHALL build the site for the address GitHub Pages reports. Until a custom domain is connected, the site SHALL work in full at `https://<user>.github.io/<repo>/` and every page SHALL be `noindex` there. Once a custom domain is set in the repository's Pages settings, the next deploy SHALL build for that domain at its root with no code change.

#### Scenario: Project address before a domain is connected
- **WHEN** the site is deployed with no custom domain configured
- **THEN** every page, stylesheet, script, font and image loads at `https://<user>.github.io/<repo>/` without 404 errors, internal links stay under that path, and pages carry `noindex`

#### Scenario: Custom domain connected
- **WHEN** a custom domain is saved in the Pages settings and the workflow runs
- **THEN** the site is built for that domain at its root and pages are indexable

### Requirement: Local preview matches production
The project SHALL provide commands to run a development server and to build and preview the production output locally.

#### Scenario: Local production preview
- **WHEN** the maintainer runs the build and preview commands
- **THEN** the site is served locally exactly as it will be deployed
