# Lumi

Lumi is a private adaptive learning app for a child, built on the whole [Marble Skill Taxonomy](https://github.com/withmarbleapp/os-taxonomy): **1,590 topics, 8 subjects, ages 4–15**. A short warm-up finds a starting point near age 7. After that, lessons climb as far as the prerequisites allow. There is no age cap.

Everything runs in the browser. Progress stays in `localStorage`. There is no account, no server, and no tracking.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL and add `/lumi/` (for example `http://127.0.0.1:4179/lumi/`). The app is built for that subpath so it matches GitHub Pages. On an iPad or iPhone, use Safari, then Share → Add to Home Screen. The first load caches the app so later visits work offline, including on a plane.

`npm run dev` prepares the taxonomy file, then starts Vite.

## How a lesson works

- **Child home.** Lumi speaks with the browser speech engine (an en-GB or en-US voice when the device has one). Tap the music note to hear a line again. The speaker button can quiet the app.
- **Warm-up.** Eight short questions place the starting frontier near age 7. Skills entirely below that floor are treated as already in place, so she is not sent back to the beginning.
- **Adaptive lesson.** About ten minutes. A topic appears only when its hard prerequisites are mastered (or already in place). Soft prerequisites are preferred. Subjects are mixed. Mastered topics return on a spaced schedule. Mastery takes several correct tries across more than one session.
- **Explore.** The full map, by subject and domain. Any topic at any age can be opened, even one the path has not reached yet.
- **Grown-ups.** Press and hold for 3 seconds, or answer 19 + 8. The parent view shows subject progress, what is next and why, session history, and the full prerequisite map (search, subject, domain, hard and soft reasons, what each topic unlocks). Topics can be marked mastered or reset. Progress exports and imports as JSON.

## Exercises

Hands-on generators cover early and later mathematics (counting, bonds, addition and subtraction, place value, shapes, time, money in koruna, fractions, decimals, percentages, ratio, multiplication and division, early algebra, data) and early and later English (phonics, sight words, rhyming, spelling, sentence building, grammar). Science, history, and a little computing use short multiple-choice questions where a good match exists.

Everything else becomes a “talk about it with a grown-up” card built from the topic description and evidence. `npm test` prints how many topics in each subject use a generator.

## Build and deploy

```bash
npm test
npm run build
npm run preview
```

The static site is in `dist/`. Publish that folder to any static host.

- **GitHub Pages:** the public site is [https://gulcin.github.io/lumi/](https://gulcin.github.io/lumi/), from [github.com/gulcin/lumi](https://github.com/gulcin/lumi). Enable Pages → GitHub Actions. `.github/workflows/pages.yml` runs `npm ci`, tests when a test script exists, `npm run build`, and deploys `dist/` with `configure-pages`, `upload-pages-artifact`, and `deploy-pages`. Vite `base`, the manifest `start_url`, and the service worker scope are `/lumi/`.
- **Netlify or Cloudflare Pages:** this build expects to be served from `/lumi/`. For a host at the domain root, change `base` in `vite.config.ts` first. Build command `npm run build`, output directory `dist`.

No environment variables and no API keys are required.

## Tests

```bash
npm test
```

Unit tests cover prerequisite gating, the climbing frontier, spaced review, mastery across sessions, and the exercise generators (including a pass over all 1,590 topics).

## Credit

Lessons, descriptions, evidence criteria, and the prerequisite graph are the Marble Skill Taxonomy (v1), © Generative Spark, Inc. (Marble), https://withmarble.com.

The database is licensed under the Open Database License 1.0 (ODbL 1.0). The descriptive text is licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). The required notice is also in the app footer and in `NOTICE`. Full files are in `vendor/marble/`.

Lumi is an independent project and is not made or endorsed by Generative Spark, Inc. or Marble.
