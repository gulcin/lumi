import type { Rng } from "../rng";
import type { Topic } from "../types";
import type { Exercise } from "./types";
import { choiceExercise, orderExercise, pick, shuffle } from "./util";

const LETTERS: { letter: string; sound: string; word: string; emoji: string }[] = [
  { letter: "S", sound: "sss", word: "sun", emoji: "☀️" },
  { letter: "M", sound: "mmm", word: "moon", emoji: "🌙" },
  { letter: "A", sound: "a", word: "apple", emoji: "🍎" },
  { letter: "T", sound: "t", word: "tram", emoji: "🚋" },
  { letter: "P", sound: "p", word: "pig", emoji: "🐷" },
  { letter: "N", sound: "nnn", word: "nest", emoji: "🪺" },
  { letter: "D", sound: "d", word: "dog", emoji: "🐶" },
  { letter: "C", sound: "k", word: "cat", emoji: "🐱" },
];

const RHYMES: { word: string; match: string; odd: string[] }[] = [
  { word: "cat", match: "hat", odd: ["sun", "cup"] },
  { word: "dog", match: "log", odd: ["pen", "bus"] },
  { word: "star", match: "car", odd: ["book", "fish"] },
  { word: "cake", match: "lake", odd: ["tree", "moon"] },
  { word: "tree", match: "bee", odd: ["rain", "book"] },
  { word: "fish", match: "dish", odd: ["frog", "star"] },
  { word: "ball", match: "wall", odd: ["cup", "sun"] },
];

const BLENDS: { sounds: string; word: string; odd: string[] }[] = [
  { sounds: "c a t", word: "cat", odd: ["cup", "can"] },
  { sounds: "d o g", word: "dog", odd: ["dig", "day"] },
  { sounds: "s u n", word: "sun", odd: ["sit", "sad"] },
  { sounds: "m a p", word: "map", odd: ["man", "mud"] },
  { sounds: "p i g", word: "pig", odd: ["pin", "pot"] },
  { sounds: "sh i p", word: "ship", odd: ["shop", "shell"] },
  { sounds: "ch i p", word: "chip", odd: ["chop", "chat"] },
  { sounds: "r ai n", word: "rain", odd: ["run", "red"] },
];

const SIGHT = ["the", "and", "said", "you", "was", "they", "come", "here", "look", "where", "friend", "because"];

const SENTENCES = [
  ["The", "swan", "is", "white"],
  ["I", "like", "red", "apples"],
  ["We", "saw", "a", "tram"],
  ["She", "can", "read", "books"],
  ["The", "castle", "is", "old"],
  ["My", "friend", "likes", "stars"],
];

const SPELLINGS: { say: string; correct: string; wrong: string[] }[] = [
  { say: "cat", correct: "cat", wrong: ["kat", "cet"] },
  { say: "ship", correct: "ship", wrong: ["sip", "shipp"] },
  { say: "rain", correct: "rain", wrong: ["rane", "rayn"] },
  { say: "cake", correct: "cake", wrong: ["caik", "cak"] },
  { say: "night", correct: "night", wrong: ["nite", "nit"] },
  { say: "phone", correct: "phone", wrong: ["fone", "foan"] },
  { say: "jumped", correct: "jumped", wrong: ["jumpt", "jumpped"] },
  { say: "happy", correct: "happy", wrong: ["hapy", "happi"] },
];

const PASSAGES: {
  text: string;
  skill: string;
  q: string;
  choices: string[];
  answer: number;
  explain: string;
}[] = [
  {
    text: "Mia watched the swans on the river. The white one dipped its head under the water.",
    skill: "detail",
    q: "What colour is the swan?",
    choices: ["White", "Red", "Green"],
    answer: 0,
    explain: "The story says the white one dipped its head.",
  },
  {
    text: "Mia watched the swans on the river. The white one dipped its head under the water. Mia thought it was looking for lunch.",
    skill: "infer",
    q: "Why did the swan dip its head?",
    choices: ["To look for food", "To fly to the moon", "To catch a tram"],
    answer: 0,
    explain: "Mia thinks the swan is looking for lunch, so it is searching for food.",
  },
  {
    text: "Leo packed his red scarf before the castle trip. He also packed a map so he would not get lost.",
    skill: "character",
    q: "Who packed a scarf?",
    choices: ["Leo", "Mia", "The swan"],
    answer: 0,
    explain: "Leo packed his red scarf.",
  },
  {
    text: "The clouds turned dark. People opened umbrellas on the bridge.",
    skill: "predict",
    q: "What will probably happen next?",
    choices: ["Rain will fall", "It will snow stars", "The bridge will fly"],
    answer: 0,
    explain: "Dark clouds and umbrellas mean rain is coming.",
  },
  {
    text: "Prague has a castle on a hill and a river called the Vltava. Trams carry people through the streets.",
    skill: "main",
    q: "What is this text mostly about?",
    choices: ["A city and how people get around", "How to bake bread", "A story about a lost dog"],
    answer: 0,
    explain: "Every sentence tells about the city, the river, or the trams.",
  },
  {
    text: "The author says the old bridge is 'a stone ribbon over the water'.",
    skill: "language",
    q: "What does 'stone ribbon' help you imagine?",
    choices: ["A long stone bridge", "A ribbon you tie in your hair", "A boat made of cake"],
    answer: 0,
    explain: "A ribbon is long and thin, so the phrase paints the long stone bridge.",
  },
  {
    text: "Some people think the tower is the oldest in the city. The guidebook says it was built in 1380.",
    skill: "fact",
    q: "Which sentence is a fact from the guidebook?",
    choices: ["It was built in 1380", "It is the prettiest tower", "Everyone loves the tower"],
    answer: 0,
    explain: "A year written in a guidebook can be checked. 'Prettiest' is an opinion.",
  },
];

function nameOf(topic: Topic): string {
  return topic.name.toLowerCase();
}

function phonics(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/rhyme|onset|rime/.test(n)) {
    const row = pick(rng, RHYMES);
    return choiceExercise(topic, rng, "phonics", {
      prompt: `Which word rhymes with ${row.word}?`,
      speak: `Which word rhymes with ${row.word}?`,
      explain: `${row.match} rhymes with ${row.word}. They share the same ending sound.`,
      choices: shuffle(rng, [row.match, ...row.odd]).map((label) => ({ label, correct: label === row.match })),
    });
  }
  if (/sight|high-frequency|tricky|fluent|common word/.test(n)) {
    const word = pick(rng, SIGHT);
    const odds = shuffle(rng, SIGHT.filter((item) => item !== word)).slice(0, 2);
    return choiceExercise(topic, rng, "sight", {
      prompt: `Tap the word: ${word}`,
      speak: `Tap the word ${word}.`,
      explain: `That word is ${word}.`,
      choices: shuffle(rng, [word, ...odds]).map((label) => ({ label, correct: label === word })),
    });
  }
  if (/blend|digraph|vowel|diphthong|trigraph|syllable/.test(n)) {
    const row = pick(rng, BLENDS);
    return choiceExercise(topic, rng, "phonics", {
      prompt: `Which word is ${row.sounds}?`,
      speak: `Which word do these sounds make? ${row.sounds}.`,
      explain: `${row.sounds} blends into ${row.word}.`,
      choices: shuffle(rng, [row.word, ...row.odd]).map((label) => ({ label, correct: label === row.word })),
    });
  }
  const row = pick(rng, LETTERS);
  const odds = shuffle(
    rng,
    LETTERS.filter((item) => item.letter !== row.letter),
  ).slice(0, 2);
  return choiceExercise(topic, rng, "phonics", {
    prompt: `Which letter makes the ${row.sound} sound, as in ${row.word}?`,
    speak: `Which letter makes the ${row.sound} sound, as in ${row.word}?`,
    explain: `${row.letter} makes the ${row.sound} sound in ${row.word}.`,
    visual: { type: "equation", text: row.emoji },
    choices: shuffle(rng, [row, ...odds]).map((item) => ({
      label: item.letter,
      correct: item.letter === row.letter,
    })),
  });
}

function spelling(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/homophone/.test(n)) {
    return choiceExercise(topic, rng, "spelling", {
      prompt: "The swan is over _____.",
      speak: "Choose the word that fits. The swan is over there.",
      explain: "There means a place. Their means belonging to them. They're means they are.",
      choices: [
        { label: "there", correct: true },
        { label: "their", correct: false },
        { label: "they're", correct: false },
      ],
    });
  }
  const row = pick(
    rng,
    SPELLINGS.filter((item) => (topic.ageRangeEnd < 8 ? item.say.length <= 4 : true)),
  );
  if (/suffix|prefix|ending/.test(n)) {
    return choiceExercise(topic, rng, "spelling", {
      prompt: "Which word uses the suffix -ed for the past?",
      speak: "Which word uses e d to show the past?",
      explain: "Jumped is the past of jump. The suffix -ed is added.",
      choices: [
        { label: "jumped", correct: true },
        { label: "jumping", correct: false },
        { label: "jumps", correct: false },
      ],
    });
  }
  return choiceExercise(topic, rng, "spelling", {
    prompt: `Which spelling is ${row.say}?`,
    speak: `Which spelling matches ${row.say}?`,
    explain: `${row.say} is spelled ${row.correct}.`,
    choices: shuffle(rng, [row.correct, ...row.wrong]).map((label) => ({ label, correct: label === row.correct })),
  });
}

function grammar(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/comma/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which list is punctuated correctly?",
      speak: "Which list uses commas correctly?",
      explain: "Commas separate the items, and 'and' comes before the last one.",
      choices: [
        { label: "apples, pears, and plums", correct: true },
        { label: "apples pears and, plums", correct: false },
        { label: "apples pears plums", correct: false },
      ],
    });
  }
  if (/apostrophe/.test(n)) {
    const possession = /possess/.test(n) || rng() < 0.5;
    if (possession) {
      return choiceExercise(topic, rng, "grammar", {
        prompt: "Which shows that the scarf belongs to Lumi?",
        speak: "Which shows that the scarf belongs to Lumi?",
        explain: "Lumi's scarf means the scarf belonging to Lumi.",
        choices: [
          { label: "Lumi's scarf", correct: true },
          { label: "Lumis scarf", correct: false },
          { label: "Lumi scarf's", correct: false },
        ],
      });
    }
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which contraction means 'do not'?",
      speak: "Which short form means do not?",
      explain: "Don't stands for do not. The apostrophe marks the missing o.",
      choices: [
        { label: "don't", correct: true },
        { label: "dont", correct: false },
        { label: "do'nt", correct: false },
      ],
    });
  }
  if (/capital|proper noun|name/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which sentence uses capitals correctly?",
      speak: "Which sentence uses capital letters correctly?",
      explain: "Prague and Monday are names, and the sentence starts with a capital.",
      choices: [
        { label: "On Monday we visit Prague.", correct: true },
        { label: "on monday we visit prague.", correct: false },
        { label: "On monday we Visit prague.", correct: false },
      ],
    });
  }
  if (/adverb/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which word tells how she ran?",
      speak: "She ran quickly. Which word tells how she ran?",
      explain: "Quickly is an adverb. It describes the verb ran.",
      choices: [
        { label: "quickly", correct: true },
        { label: "swan", correct: false },
        { label: "red", correct: false },
      ],
    });
  }
  if (/adjective/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which word describes the castle?",
      speak: "The old castle. Which word describes the castle?",
      explain: "Old is an adjective. It describes the noun castle.",
      choices: [
        { label: "old", correct: true },
        { label: "castle", correct: false },
        { label: "visit", correct: false },
      ],
    });
  }
  if (/verb|tense|past|present|progressive/.test(n)) {
    const past = /past/.test(n) || (!/present|future/.test(n) && rng() < 0.5);
    return choiceExercise(topic, rng, "grammar", {
      prompt: past ? "Which verb is in the past?" : "Which verb is happening now?",
      speak: past ? "Which verb shows the past?" : "Which verb shows it is happening now?",
      explain: past ? "Walked is the past of walk." : "Is walking shows an action happening now.",
      choices: past
        ? [
            { label: "walked", correct: true },
            { label: "walk", correct: false },
            { label: "walking tomorrow", correct: false },
          ]
        : [
            { label: "is walking", correct: true },
            { label: "walked", correct: false },
            { label: "will walk", correct: false },
          ],
    });
  }
  if (/pronoun/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which pronoun can replace 'Lumi'?",
      speak: "Which pronoun can stand in for the name Lumi?",
      explain: "She can replace Lumi when we already know who we mean.",
      choices: [
        { label: "she", correct: true },
        { label: "castle", correct: false },
        { label: "quickly", correct: false },
      ],
    });
  }
  if (/conjunction|because|clause|subordinat|connect/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which word joins the two ideas?",
      speak: "We went inside. It was raining. Which word can join those ideas?",
      explain: "Because joins the reason to the action: we went inside because it was raining.",
      choices: [
        { label: "because", correct: true },
        { label: "swan", correct: false },
        { label: "red", correct: false },
      ],
    });
  }
  if (/preposition/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which word shows where the cat is?",
      speak: "The cat is under the chair. Which word shows where?",
      explain: "Under is a preposition. It shows place.",
      choices: [
        { label: "under", correct: true },
        { label: "cat", correct: false },
        { label: "sleeps", correct: false },
      ],
    });
  }
  if (/speech|dialogue|inverted/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which sentence marks speech correctly?",
      speak: "Which sentence uses speech marks correctly?",
      explain: "Speech marks go around the words someone says.",
      choices: [
        { label: 'Lumi said, "Hello."', correct: true },
        { label: 'Lumi said Hello.', correct: false },
        { label: 'Lumi "said", Hello.', correct: false },
      ],
    });
  }
  if (/passive|active/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which sentence is active?",
      speak: "Which sentence is active? The doer comes first.",
      explain: "In an active sentence, the swan does the action.",
      choices: [
        { label: "The swan ate the bread.", correct: true },
        { label: "The bread was eaten by the swan.", correct: false },
        { label: "The bread was eaten.", correct: false },
      ],
    });
  }
  if (/article|determiner/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which article fits? I saw ___ owl.",
      speak: "Which word fits? I saw an owl.",
      explain: "Owl starts with a vowel sound, so we say an owl.",
      choices: [
        { label: "an", correct: true },
        { label: "a", correct: false },
        { label: "the the", correct: false },
      ],
    });
  }
  if (/plural/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which is the plural of child?",
      speak: "Which word means more than one child?",
      explain: "The plural of child is children.",
      choices: [
        { label: "children", correct: true },
        { label: "childs", correct: false },
        { label: "childes", correct: false },
      ],
    });
  }
  if (/noun/.test(n) && !/pronoun/.test(n)) {
    return choiceExercise(topic, rng, "grammar", {
      prompt: "Which word is a noun?",
      speak: "Which word is a noun, a person, place, or thing?",
      explain: "Castle is a noun. It names a thing.",
      choices: [
        { label: "castle", correct: true },
        { label: "quickly", correct: false },
        { label: "jump", correct: false },
      ],
    });
  }
  if (/sentence|build|clause|word order/.test(n) || rng() < 0.45) {
    const sentence = pick(rng, SENTENCES);
    return orderExercise(topic, rng, "sentences", {
      prompt: "Tap the words to make a sentence.",
      speak: `Tap the words in order to make a sentence. ${sentence.join(" ")}.`,
      explain: `${sentence.join(" ")}.`,
      labels: sentence,
    });
  }
  return choiceExercise(topic, rng, "grammar", {
    prompt: "Which is a complete sentence?",
    speak: "Which one is a complete sentence?",
    explain: "A sentence has a who and a what they do, and it finishes with a stop.",
    choices: [
      { label: "The tram crossed the bridge.", correct: true },
      { label: "Across the old bridge", correct: false },
      { label: "Running very fast", correct: false },
    ],
  });
}

function vocabulary(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/antonym|opposite/.test(n)) {
    return choiceExercise(topic, rng, "vocabulary", {
      prompt: "Which word is the opposite of cold?",
      speak: "Which word is the opposite of cold?",
      explain: "Hot is the opposite of cold.",
      choices: [
        { label: "hot", correct: true },
        { label: "freezing", correct: false },
        { label: "ice", correct: false },
      ],
    });
  }
  if (/prefix|suffix|root|family/.test(n)) {
    return choiceExercise(topic, rng, "vocabulary", {
      prompt: "If un- means not, what is unhappy?",
      speak: "If the prefix un means not, what does unhappy mean?",
      explain: "Unhappy means not happy.",
      choices: [
        { label: "not happy", correct: true },
        { label: "very happy", correct: false },
        { label: "a kind of hat", correct: false },
      ],
    });
  }
  if (/category|sort|group/.test(n)) {
    return choiceExercise(topic, rng, "vocabulary", {
      prompt: "Which word does not belong with apple, pear, plum?",
      speak: "Which word does not belong with apple, pear, and plum?",
      explain: "Apple, pear, and plum are fruits. A tram is not.",
      choices: [
        { label: "tram", correct: true },
        { label: "apple", correct: false },
        { label: "pear", correct: false },
      ],
    });
  }
  return choiceExercise(topic, rng, "vocabulary", {
    prompt: "Which word means almost the same as big?",
    speak: "Which word means almost the same as big?",
    explain: "Large means almost the same as big.",
    choices: [
      { label: "large", correct: true },
      { label: "tiny", correct: false },
      { label: "blue", correct: false },
    ],
  });
}

function reading(topic: Topic, rng: Rng): Exercise | null {
  const n = nameOf(topic);
  const skill = /infer|between the lines|imply/.test(n)
    ? "infer"
    : /predict/.test(n)
      ? "predict"
      : /character|viewpoint/.test(n)
        ? "character"
        : /main|summar|topic|key detail/.test(n)
          ? "main"
          : /language|word choice|phrase|figurative|sensory/.test(n)
            ? "language"
            : /fact|opinion|author/.test(n)
              ? "fact"
              : "detail";
  const pool = PASSAGES.filter((item) => item.skill === skill || (topic.ageRangeStart <= 10 && item.skill === "detail"));
  const usable = pool.length ? pool : topic.ageRangeStart <= 10 ? PASSAGES.filter((item) => item.skill === "detail") : [];
  if (!usable.length) return null;
  if (topic.ageRangeStart >= 11 && !PASSAGES.some((item) => item.skill === skill && skill !== "detail")) return null;
  const row = pick(rng, usable);
  return choiceExercise(topic, rng, "reading", {
    prompt: `${row.text} ${row.q}`,
    speak: `${row.text} ${row.q}`,
    explain: row.explain,
    choices: row.choices.map((label, index) => ({ label, correct: index === row.answer })),
  });
}

function writing(topic: Topic, rng: Rng): Exercise | null {
  const n = nameOf(topic);
  if (topic.ageRangeStart <= 8 || /sentence/.test(n)) {
    const sentence = pick(rng, SENTENCES);
    return orderExercise(topic, rng, "sentences", {
      prompt: "Tap the words to build a sentence.",
      speak: `Build this sentence. ${sentence.join(" ")}.`,
      explain: `${sentence.join(" ")}.`,
      labels: sentence,
    });
  }
  if (/poem|stanza|verse/.test(n) && topic.ageRangeStart >= 9) return null;
  return choiceExercise(topic, rng, "writing", {
    prompt: "Which sentence is the stronger opening for a story?",
    speak: "Which sentence is the stronger opening for a story?",
    explain: "A strong opening puts us in a moment. The tram and the scarf do that.",
    choices: [
      { label: "The night tram hissed to a stop, and Lumi's scarf blew across the bridge.", correct: true },
      { label: "This story is about some things that happened.", correct: false },
      { label: "I will now write a story.", correct: false },
    ],
  });
}

export function tryLiteracy(topic: Topic, rng: Rng): Exercise | null {
  if (topic.subject !== "English") return null;
  const domain = topic.domain;
  if (domain === "Handwriting & Transcription" || domain === "Speaking & Listening" || domain === "English Thinking") {
    return null;
  }
  if (domain === "Phonics & Word Reading") return phonics(topic, rng);
  if (domain === "Spelling & Word Study") return spelling(topic, rng);
  if (domain === "Grammar & Punctuation") return grammar(topic, rng);
  if (domain === "Vocabulary") return vocabulary(topic, rng);
  if (domain === "Reading Comprehension") return reading(topic, rng);
  if (domain === "Writing Composition") return writing(topic, rng);
  return null;
}
