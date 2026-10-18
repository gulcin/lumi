# Lumi art inventory

One storybook style throughout: soft watercolor and gouache, warm paper, a coral fox with a cream muzzle and a gold chest tuft. Words stay real HTML so they can be read, spoken, and tapped. Paintings sit beside or above the words. They do not replace them.

Cutouts are transparent WebP at 1x and 2x (`name.webp` and `name@2x.webp`). Theme scenes, subject spots, and dens are the same pair of sizes. The service worker cache id is `lumi-art-1` and it precaches WebP. iPad splash JPEGs are linked for home-screen startup and left out of the precache so the first install stays small.

The pose sheet is `public/art/lumi/sheet.webp`. The five poses used in the app are the transparent cutouts next to it.

| Screen | Status |
| --- | --- |
| Name | Painted. Happy Lumi, large type, big buttons. |
| Home and theme home | Painted. Standing Lumi, star, acorn, and a header scene for each of the six themes. Theme names and blurbs stay in the card. |
| Skill map (Explore) | Painted. A spot for each subject (maths, reading, science, history with the cave and mammoth, and the other subjects). Lesson rows stay text with the three-state legend. |
| Theme path | Painted. The theme's header scene, then the legend and the lesson list in type. |
| Inquiry | Painted. Theme scene above the wonder. Lumi uses the listening pose. The question and lines stay text. |
| Practice | Painted companion. Lumi stands beside the question. Choices, numbers, and the keypad stay large type so the answer is obvious. |
| Reflect | Painted companion. Thinking pose beside "What did you find out?" The four replies stay text buttons. |
| Learner-profile badges | Clear text, on purpose. Trait names stay readable. An earned badge gets a small painted acorn. |
| Acorn shop and dress-up | Painted. Hats, scarves, and glasses are cutouts aligned to the standing poses (happy, thinking, listening). Celebrating and sleeping hide them so they do not clip. Starry and leafy dens are full scenes in the shop, and a window peek behind Lumi when worn. |
| Photo journal | Painted. Sleeping Lumi when it is empty. Celebrating Lumi after a photo. Photos themselves are the child's. |
| Why chat | Painted. Happy pose, or the listening pose while the mic is held. Dress-up stays on. The question and reply stay text. |
| Grown-up gate | Painted. Happy Lumi above the hold button. The sum stays text. |
| Grown-up starting check | Painted header. The subject's spot sits above the three lessons. Yep, Getting there, and Not yet stay text. |
| Child warm-up | Painted companion. Thinking Lumi beside a large keypad. |
| Ready | Painted. Celebrating pose. The starting line stays a sentence. |
| Interests | Painted. A spot for each love (animals, dinosaurs, space, oceans, cooking, sports, building, nature, art, music, stories, places). The label stays text. |
| Grown-ups: themes and areas | Painted. Each theme and subject area has its scene or spot. Counts stay numbers. |
| Grown-ups: today, map, sessions, backup | Clear UI. The daily note, prerequisite map, and sync code stay type. A QR code stays a QR code. |
| Loading | Painted. Sleeping Lumi and one line. |
| Missing lesson book | Painted. Thinking Lumi and one line. |
| Celebration | Painted. Celebrating Lumi and a painted star beside each new skill name. |
| App icon | Painted. Fox face, full bleed, at 180, 192, and 512, plus a padded 512 for maskable icons. |
| iPad splash | Painted. Portrait and landscape for 11-inch and 12.9-inch iPad, linked as Apple startup images. |

Counting pictures inside a maths question stay simple repeated marks. Those marks are the thing being counted, and a painted scene would make the number harder to see.

Dress-up is hidden on the tiny fox in the top bar, where a hat would be too small to read.
