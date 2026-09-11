# Loughborough Outwoods Cricket Club website

Static recruitment-first website for Loughborough Outwoods Cricket Club (LOCC), built for GitHub Pages.

## Pages
- `index.html` — homepage / 2027 recruitment
- `join.html` — player enquiry flow
- `teams.html` — 1st XI / 2nd XI cricket
- `about.html` — club overview
- `sponsors.html` — sponsor page

## Design
The visual system is a restrained neo-brutalist style: bold borders, bright club-like colour blocks, oversized typography and real club photography.

## Images
The first version intentionally uses placeholders instead of hotlinking images from the old Wix site. Add original LOCC photos to an `images/` folder and update the relevant image slots. Suggested assets:
- `images/hero-team.jpg`
- `images/hero-action.jpg`
- `images/team.jpg`
- `images/bowling.jpg`
- `images/batting.jpg`
- `images/social.jpg`
- `images/ground.jpg`

## Player enquiries
The Join page currently turns the form into a pre-filled email to `lborooutwoodscc@gmail.com`, so it works without a backend. This can later be replaced with a Google Form or other form endpoint.

## Deployment
`.github/workflows/pages.yml` deploys the repository to GitHub Pages on every push to `main`.

Initial expected URL:
`https://akshaymenon.github.io/loughborough-outwoods-cc/`

When a custom domain is purchased, update the sitemap / canonical URLs and configure the domain in GitHub Pages.
