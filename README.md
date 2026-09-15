# Loughborough Outwoods Cricket Club website

Official website for **Loughborough Outwoods Cricket Club (LOCC)** in Loughborough, Leicestershire.

Live site: **https://outwoodscc.co.uk**

The site is a lightweight static website hosted on GitHub Pages. It is designed to support player recruitment, club information, junior cricket, sponsors, club media and a Play-Cricket-powered match centre without requiring a CMS or application backend.

## Main pages

- `/` — homepage
- `/about.html` — club overview, contacts and ground information
- `/join.html` — senior player recruitment and contact routes
- `/fixtures-results/` — fixtures, results, league tables, player statistics and past-season positions
- `/fixtures-results/match.html?id=...` — local match scorecards where full Play-Cricket data is available
- `/juniors/` — junior cricket information
- `/gallery.html` — club gallery
- `/sponsors.html` — club sponsors and sponsorship information
- `/cricket-club-loughborough/` — local cricket / search landing page
- `/404.html` — custom not-found page

## Design

The current visual direction is based on **English cricket heritage** rather than a generic sports template:

- deep forest green
- warm ivory / paper backgrounds
- sage supporting tones
- restrained brass accents
- serif display typography paired with a clean sans-serif
- real LOCC photography and club assets

The UI is deliberately simple and editorial. Large headings, kickers and decorative labels are used only where they add useful hierarchy rather than repeating the same information.

Core styles live in:

- `assets/styles.css` — base system and shared components
- `assets/visual.css` — page-specific visual layout
- `assets/polish.css` — site-wide polish, accessibility and responsive refinements
- `assets/cricket.css` — match-centre base styles
- `assets/cricket-polish.css` — match-centre UI/UX refinements

## Shared JavaScript

- `assets/site.js` — mobile navigation, gallery/lightbox behaviour, Instagram feed handling, footer year and recruitment-poster modal
- `assets/cricket.js` — Play-Cricket data rendering, fixtures/results, tables, stats and scorecards
- `assets/cricket-polish.js` — match-centre presentation enhancements, grouped match days and keyboard-accessible tabs

JavaScript syntax is checked during the GitHub Pages deployment before the site is published.

## Join / recruitment page

The Join page currently provides:

- new-recruits WhatsApp hub
- Instagram contact route
- club email and membership contact details
- desktop-only 2027 recruitment poster modal using `assets/images/recruitment/new-players-wanted-2027.png`

The page also explains that all abilities are welcome and that weekly winter nets are planned from November until the cricket season begins, alongside summer training.

Detailed net dates, times and venues can be added once confirmed.

## Play-Cricket integration

Cricket data is fetched from the Play-Cricket API using:

- repository secret: `PLAY_CRICKET_API_TOKEN`
- repository variable: `PLAY_CRICKET_SITE_ID`
- default LOCC site ID: `7239`

The main sync script is:

`/.github/scripts/sync_play_cricket.py`

It builds:

`/data/cricket/site.json`

The public data model includes:

- senior 1st XI and 2nd XI fixtures
- recent result summaries
- full scorecards where fetched
- current and historical league tables
- historical finishing positions
- batting statistics
- bowling statistics
- fielding statistics
- team-specific statistics

### Refresh schedule

The dedicated workflow is:

`/.github/workflows/sync-cricket.yml`

It runs **once a week on Wednesday at 05:17 UTC**:

```text
17 5 * * 3
```

That is 05:17 during GMT and 06:17 during BST.

The workflow can also be run manually from:

**GitHub → Actions → Refresh Play-Cricket data → Run workflow**

A normal GitHub Pages deployment also attempts a fresh Play-Cricket sync for the deployed build. The dedicated Wednesday workflow is the one that commits refreshed `data/cricket/site.json` back to the repository.

## Historical cricket data

Historical data is deliberately protected when a new season starts.

Before each automated refresh, the current `site.json` is copied. After fresh Play-Cricket data is generated, `/.github/scripts/preserve_cricket_history.py` merges previously collected historical data back into the new file.

This protects:

- historical result summaries through `archiveResults`
- previously fetched full scorecards through `matches`
- historical league tables
- historical finishing positions
- season-by-season player statistics through `statsArchive`

Fresh data wins where the same match/table exists, while older information is retained. This means, for example, that **2026 data is not discarded when 2027 becomes the active season**.

The live Match Centre can remain focused on recent/current-season information while the underlying historical data remains available for future archive views.

## GitHub Pages deployment

Deployment workflow:

`/.github/workflows/pages.yml`

Every push to `main` triggers a deployment. The workflow currently:

1. checks JavaScript syntax
2. sets up Python
3. checks Python script syntax
4. prepares sponsor-logo assets
5. snapshots the existing cricket archive
6. attempts a fresh Play-Cricket sync
7. restores/preserves historical cricket data
8. uploads and deploys the static site to GitHub Pages

The Play-Cricket step is allowed to fail without taking the whole website offline; committed cricket data remains available as the fallback.

## Sponsor assets

`/.github/scripts/clean_sponsor_logos.py` prepares sponsor-logo assets during deployment so the source images can remain easy to manage while the website receives consistent presentation-ready versions.

## Navigation

The full navigation and footer are present in each HTML page rather than being generated at runtime by JavaScript. This means the site remains navigable even if JavaScript fails.

`site.js` handles navigation behaviour such as the mobile menu, but it is not responsible for constructing the core navigation structure.

## Accessibility / resilience

Current safeguards include:

- skip-to-content links
- visible keyboard focus states
- accessible active navigation states
- keyboard-operable Match Centre tabs
- keyboard-operable gallery/lightbox controls
- responsive heading sizing
- contrast-adjusted small text
- reduced-motion handling
- root-relative paths on the custom 404 page
- deployment-time JavaScript and Python syntax checks

## Domain

The production custom domain is:

**outwoodscc.co.uk**

Canonical URLs, metadata and structured data should use the production domain rather than the default `github.io` address.
