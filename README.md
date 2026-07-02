# Operation MetaMind

Official website for Operation MetaMind, an independent, physician-led research collective.

**Live site:** [operationmetamind.eu.org](https://operationmetamind.eu.org) (pending DNS)

## Stack

- Static HTML5 and CSS3 with vanilla JavaScript, no build step
- three.js (via CDN) for the kinetic-typography hero
- Hosted on GitHub Pages
- DNS via Cloudflare, email routing via Cloudflare Email Routing

## Local development

Run `python serve.py` and open `http://localhost:8080`. The script serves the
folder with caching disabled so edits show up on reload. GitHub Pages serves the
static files directly; `serve.py` is dev only.
