# Lumi

Lumi is a private adaptive learning app for a child in grade 3 (IB PYP, typically ages 8–9), built on the [Marble Skill Taxonomy](https://github.com/withmarbleapp/os-taxonomy) plus a small set of original Stone Age lessons. The warm-up starts around grade 3. Lessons still climb as far as the prerequisites allow, and drop back when a later skill is shaky. There is no age cap and no daily time limit.

The child home is organised around the six PYP transdisciplinary themes. Each lesson opens with an original “I wonder…” inquiry, then the activity. Learner-profile badges mark behaviours such as trying a harder step or reflecting. A short reflect step follows a new mastery. The grown-up view groups progress by theme and by subject area. That map is unofficial and is not an IB endorsement. Only the public theme names and learner-profile trait names are used.

Progress stays in `localStorage` first. Optional family sync and a voice “why?” chat use a Cloudflare Worker and ClickHouse Managed Postgres. If `VITE_LUMI_API_URL` is unset, those controls stay hidden and the app works offline exactly as a local PWA. Setup is in [SETUP.md](SETUP.md).

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL and add `/lumi/` (for example `http://127.0.0.1:4179/lumi/`). The app is built for that subpath so it matches GitHub Pages. On an iPad or iPhone, use Safari, then Share → Add to Home Screen. The icon is the painted fox, at `apple-touch-icon.png`. The first load caches the app so later visits work offline, including on a plane. When a newer Lumi is published, the home-screen app looks on open, when you come back to it, and about every 30 minutes. A banner says Lumi learned something new, and one tap updates it in place. A lesson already on screen waits until the next time the app is opened. Progress stays in the same `lumi.progress.v1` key.

`npm run dev` prepares the taxonomy file, then starts Vite.

## How a lesson works

- **Child home.** Six theme paths, plus interests, an acorn shop, a photo journal, and (when sync is configured) Ask Lumi. Lumi speaks with the browser speech engine. Tap the music note to hear a line again. The speaker button can quiet the app.
- **Warm-up.** Eight short questions place the starting frontier near the grown-up’s chosen grade. The default is grade 3, about age 8. Skills entirely below that floor are treated as already in place, unless a later lesson shows a gap. A grown-up can also answer three prompts per subject (Yep / Getting there / Not yet) to seed the prerequisite graph. That check can be run again from the grown-up view.
- **Adaptive lesson.** About ten minutes, not a daily cap. A topic appears only when its hard prerequisites are mastered (or already in place). Soft prerequisites are preferred. Subjects are mixed. Interests nudge the picker inside the current frontier and never skip a prerequisite. Mastered topics return on a spaced schedule. Mastery takes several correct tries across more than one session. After a new mastery, the child picks what they found out.
- **Explore.** The full map, by subject and domain, with three states: Mastered, Lumi's working on, and Coming up. Any topic at any age can be opened.
- **Acorns.** Hands-on answers, reflections, and mastery earn acorns. Rapid tapping does not. The shop dresses Lumi with hats, scarves, glasses, and den decorations. The outfit syncs with progress.
- **Photo journal.** “Show what I made” stores a downscaled photo in IndexedDB on this device only, with a caption. The app asks the child not to photograph faces.
- **Grown-ups.** Press and hold for 3 seconds, or answer 19 + 8. The parent view shows subject progress, PYP themes, a daily note (“Today … explored …”) with off-screen ideas, what is next and why, session history, chat questions when sync is on, and the full prerequisite map. Topics can be marked mastered or reset. The starting grade can be changed. Progress exports and imports as JSON. Family sync, when configured, shows a code and a QR code. The version, short commit, and build date sit under the tabs, with Check for updates. Notes from Tell us are listed there too. What's new lists the changelog. After an update, the child sees a short New! note once.

## Exercises

Hands-on generators cover early and later mathematics (counting, bonds, addition and subtraction, place value, shapes, time, money in koruna, fractions, decimals, percentages, ratio, multiplication and division, early algebra, data) and early and later English (phonics, sight words, rhyming, spelling, sentence building, grammar). Science, history (including the Stone Age additions), and a little computing use short multiple-choice questions where a good match exists.

Everything else becomes a “talk about it with a grown-up” card built from the topic description and evidence. `npm test` prints how many topics in each subject use a generator.

## Build and deploy

```bash
npm test
npm run build
npm run preview
```

The static site is in `dist/`. Publish that folder to any static host.

- **GitHub Pages:** the public site is [https://gulcin.github.io/lumi/](https://gulcin.github.io/lumi/), from [github.com/gulcin/lumi](https://github.com/gulcin/lumi). `.github/workflows/pages.yml` runs `npm ci`, tests, `npm run build`, and deploys `dist/`. Vite `base`, the manifest `start_url`, and the service worker scope are `/lumi/`. The build reads the Actions variable `VITE_LUMI_API_URL` when it is set. See [SETUP.md](SETUP.md) for the Worker and Postgres steps.
- **Netlify or Cloudflare Pages:** this build expects to be served from `/lumi/`. For a host at the domain root, change `base` in `vite.config.ts` first. Build command `npm run build`, output directory `dist`.

The API, when you want sync or chat, is the Worker in `worker/`. Deploy it with `npx wrangler deploy` after the secrets in SETUP.md. Do not put `DATABASE_URL`, `ADMIN_TOKEN`, or a model key in the Pages build.

## Tests

```bash
npm test
```

Unit tests cover prerequisite gating, the climbing frontier, gap filling, spaced review, mastery across sessions, the PYP map (every topic, including Stone Age additions), sync merge, and the exercise generators.

## Credit

Lessons, descriptions, evidence criteria, and the prerequisite graph for the Marble topics are the Marble Skill Taxonomy (v1), © Generative Spark, Inc. (Marble), https://withmarble.com.

The database is licensed under the Open Database License 1.0 (ODbL 1.0). The descriptive text is licensed under Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0). The required notice is also in the app footer and in `NOTICE`. Full files are in `vendor/marble/`.

Stone Age topics in `vendor/lumi/` are original Lumi additions. They are not part of the Marble taxonomy. They are merged in at prepare time with ids prefixed `lumi_`.

Lumi is an independent project and is not made or endorsed by Generative Spark, Inc., Marble, or the International Baccalaureate.
