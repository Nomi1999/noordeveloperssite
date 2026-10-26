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

### Requirement: Local preview matches production
The project SHALL provide commands to run a development server and to build and preview the production output locally.

#### Scenario: Local production preview
- **WHEN** the maintainer runs the build and preview commands
- **THEN** the site is served locally exactly as it will be deployed
