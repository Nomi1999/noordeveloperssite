## Purpose

Makes every page discoverable by search engines and well presented when shared, with local-business data that supports Noor Developers' presence in Faisalabad searches.

## ADDED Requirements

### Requirement: Page metadata
Every page SHALL have a unique title and meta description. Titles SHALL follow the pattern "<Page title> | Noor Developers", except the home page, which SHALL lead with the company name.

#### Scenario: Unique titles
- **WHEN** all built pages are compared
- **THEN** no two pages share the same title or description

### Requirement: Canonical URLs
Every page SHALL declare a canonical URL on `https://noordevelopers.pk` using a consistent trailing-slash policy.

#### Scenario: Canonical on a design page
- **WHEN** `/designs/1-kanal` is built
- **THEN** its canonical URL is the absolute `https://noordevelopers.pk` URL for that path

### Requirement: Social previews
Every page SHALL include Open Graph and Twitter card tags (title, description, URL and an image). Pages without their own image SHALL use a default branded share image.

#### Scenario: Link shared on WhatsApp
- **WHEN** a page URL is pasted into WhatsApp
- **THEN** the preview shows the page title, description and an image

### Requirement: Sitemap and robots
The site SHALL publish `sitemap.xml` listing every public page and `robots.txt` allowing crawling and pointing to the sitemap. The 404 page SHALL NOT appear in the sitemap.

#### Scenario: Sitemap contents
- **WHEN** the site is built
- **THEN** `sitemap.xml` lists every route in the route map with absolute URLs and excludes the 404 page

### Requirement: Local business structured data
The site SHALL include JSON-LD structured data describing Noor Developers as a local home-and-construction business located in Faisalabad, Pakistan, with name, URL, logo, phone, address and opening hours taken from the contact configuration. It SHALL NOT include ratings, reviews or price ranges.

#### Scenario: Structured data validity
- **WHEN** the home page's JSON-LD is run through a schema.org validator
- **THEN** it parses without errors and its contact values match the contact configuration
