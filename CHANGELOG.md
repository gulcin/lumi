# Changelog

All notable changes to Lumi are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-10-18

Aida can tell us about a bug or an idea from any screen.

### Added

- A small painted Tell us button on every screen. She picks Bug or Idea, types or says a note, and the screen she is on is remembered.
- The note is saved for grown-ups. When the family connection can take it, Lumi sends it on. Until then, Send to Mum opens a letter with the details.

## [1.1.2] - 2026-10-18

Words stay a comfortable size on iPhone and iPad, even when the system text size is large.

### Fixed

- iOS was enlarging every word. Lumi now keeps its own type scale, so a lesson still fits the screen.

## [1.1.1] - 2026-10-18

The home screen icon is the painted fox, including on an iPhone.

### Fixed

- Add to Home Screen was showing a plain letter L. iOS now gets an opaque fox picture at apple-touch-icon.png, including the 180, 167, and 152 sizes, and the service worker leaves those pictures on the network.

## [1.1.0] - 2026-10-18

Lumi can take an update on the iPad home screen, without opening the website again.

### Added

- A painted note when a new copy is ready: "Lumi learned something new!" One tap on Update brings it in.
- Lumi looks for an update when the app opens, when you come back to it, and about every 30 minutes.
- A lesson that is already open keeps going. The update waits and comes in the next time the app is opened.
- Grown-ups can see the current version and tap Check for updates.
- The version file and the service worker are fetched fresh, so an old copy does not sit in the way.

## [1.0.0] - 2026-10-18

First marked version. This is Lumi as it stands for Aida: a grade 3 learning app on the iPad, with painted pictures and a path that can climb as far as she wants.

### Added

- Adaptive lessons from the Marble skill map. The path steps down when something is shaky and climbs with no ceiling. There is no daily time limit.
- A home a child can use on an iPad, with practice, a line she can hear, and an icon and startup picture for the home screen.
- Grade 3 as the usual starting point. A grown-up can set a different grade. Lessons still move down and up from there.
- The six PYP themes as paths through the lessons. Each lesson opens with an original "I wonder…" question, then the activity. A reflect step and learner-profile badges sit beside the work. The theme map is unofficial. The International Baccalaureate does not endorse Lumi.
- Stone Age lessons, including caves and mammoths, that lead on toward Ancient Egypt.
- A grown-up starting check of three questions in each subject, as the first step on the home screen. A shorter child warm-up is still there.
- Interests that lean the next ready lesson toward what she loves, and never skip a prerequisite.
- A lesson map with three states: Mastered, Lumi's working on, and Coming up.
- Acorns for careful answers, reflection, and mastery. The shop lets Lumi wear a hat, a scarf, and glasses, or rest in a den.
- A photo journal that stays in the browser on this iPad and is never uploaded.
- A daily note for grown-ups, with an idea for off the screen, including something around dinner.
- Family sync of the nickname and lesson progress only. The journal is not part of sync.
- A why-chat for questions about the lesson, when the family connection is set up.
- Painted storybook pictures: Lumi happy, thinking, listening, celebrating, and sleeping; a scene for each of the six themes; and a picture for each subject.
- A version in Grown-ups, a What's new page, and a short New! note for her after an update.

[1.2.0]: https://github.com/gulcin/lumi/releases/tag/v1.2.0
[1.1.2]: https://github.com/gulcin/lumi/releases/tag/v1.1.2
[1.1.1]: https://github.com/gulcin/lumi/releases/tag/v1.1.1
[1.1.0]: https://github.com/gulcin/lumi/releases/tag/v1.1.0
[1.0.0]: https://github.com/gulcin/lumi/releases/tag/v1.0.0
