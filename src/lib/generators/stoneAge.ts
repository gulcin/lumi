import type { Rng } from "../rng";
import type { Topic } from "../types";
import type { Exercise } from "./types";
import { choiceExercise, orderExercise, pick } from "./util";

type Q = { prompt: string; explain: string; choices: string[]; answer: number };

const BANK: Record<string, Q[]> = {
  lumi_long_ago: [
    {
      prompt: "Which one belongs to long ago, not to today?",
      explain: "A stone hand axe is from long ago. A phone and a bus are from today.",
      choices: ["A stone hand axe", "A mobile phone", "A city bus"],
      answer: 0,
    },
  ],
  lumi_prehistory: [
    {
      prompt: "Prehistory means the time…",
      explain: "Prehistory is before people wrote records. We use objects as clues.",
      choices: ["Before writing", "After newspapers", "Only last year"],
      answer: 0,
    },
  ],
  lumi_early_humans: [
    {
      prompt: "A good early camp was often near…",
      explain: "Water, and food nearby, made a safer camp than a bare ice field.",
      choices: ["Water", "The middle of an ice sheet with nothing to drink", "A moving lava flow"],
      answer: 0,
    },
  ],
  lumi_hunter_gatherers: [
    {
      prompt: "Hunter-gatherers got food by…",
      explain: "They hunted, fished, and gathered plants. Farms came later.",
      choices: ["Hunting and gathering", "Buying it in a shop", "Growing wheat in every camp"],
      answer: 0,
    },
  ],
  lumi_first_tools: [
    {
      prompt: "The first tools were often made from…",
      explain: "Stone, bone, and wood were shaped into tools. That is why it is the Stone Age.",
      choices: ["Stone, bone, and wood", "Plastic and batteries", "Sheet glass"],
      answer: 0,
    },
  ],
  lumi_fire: [
    {
      prompt: "Which is a way fire helped a Stone Age camp?",
      explain: "Fire gave warmth, light, and a way to cook. It needed care.",
      choices: ["Warmth and cooking", "Making it rain", "Freezing the river"],
      answer: 0,
    },
  ],
  lumi_cave_paintings: [
    {
      prompt: "Lascaux and Chauvet are famous for…",
      explain: "Both are caves in France with paintings of animals from long ago.",
      choices: ["Cave paintings of animals", "Roman roads", "Medieval castles"],
      answer: 0,
    },
  ],
  lumi_ice_age_animals: [
    {
      prompt: "Which animal lived in the Ice Age and is not alive now?",
      explain: "Woolly mammoths lived in the cold and later died out.",
      choices: ["A woolly mammoth", "A pet hamster", "A city pigeon"],
      answer: 0,
    },
  ],
  lumi_stone_age_periods: [
    {
      prompt: "Which order is right?",
      explain: "Old, then Middle, then New. Farming belongs with the New Stone Age.",
      choices: ["Old, Middle, New", "New, then Old, then Middle", "Middle, then New, then Old only"],
      answer: 0,
    },
  ],
  lumi_first_farmers: [
    {
      prompt: "The first farmers began to…",
      explain: "Neolithic farmers grew crops such as wheat and kept animals.",
      choices: ["Grow crops and keep animals", "Write newspapers", "Build aeroplanes"],
      answer: 0,
    },
  ],
  lumi_skara_brae: [
    {
      prompt: "Skara Brae is…",
      explain: "Skara Brae is a Neolithic stone village in Orkney, Scotland.",
      choices: ["A stone village in Orkney, Scotland", "A pyramid in Egypt", "A castle from the Middle Ages"],
      answer: 0,
    },
  ],
  lumi_stonehenge: [
    {
      prompt: "Stonehenge is…",
      explain: "Stonehenge is a circle of huge standing stones in England.",
      choices: ["A circle of huge standing stones", "A wooden boat", "A glass tower"],
      answer: 0,
    },
  ],
  lumi_bronze_age: [
    {
      prompt: "Bronze is made by mixing…",
      explain: "Bronze mixes copper and tin. It made stronger tools than many stone ones.",
      choices: ["Copper and tin", "Sand and sugar", "Wool and water"],
      answer: 0,
    },
  ],
  lumi_archaeology: [
    {
      prompt: "An artefact is…",
      explain: "An artefact is something people made. Archaeologists record where it was found.",
      choices: ["An object people made", "A cloud", "A wild river with no people"],
      answer: 0,
    },
  ],
  lumi_stone_timeline: [
    {
      prompt: "On a simple timeline, which comes first?",
      explain: "Hunter-gatherers of the Old Stone Age come before farmers, bronze, and ancient Egypt.",
      choices: ["Old Stone Age hunter-gatherers", "Ancient Egypt", "The Bronze Age"],
      answer: 0,
    },
  ],
};

export function tryStoneAge(topic: Topic, rng: Rng): Exercise | null {
  if (topic.id === "lumi_stone_timeline") {
    if (rng() < 0.45) {
      return orderExercise(topic, rng, "stone-age", {
        prompt: "Put these in time order, oldest first.",
        speak: "Put these in time order, oldest first.",
        explain: "The Old Stone Age comes first, then farming in the New Stone Age, then bronze, then ancient Egypt.",
        labels: ["Old Stone Age", "New Stone Age farms", "Bronze Age", "Ancient Egypt"],
      });
    }
  }
  const bank = BANK[topic.id];
  if (!bank?.length) return null;
  const question = pick(rng, bank);
  return choiceExercise(topic, rng, "stone-age", {
    prompt: question.prompt,
    speak: question.prompt,
    explain: question.explain,
    choices: question.choices.map((label, index) => ({ label, correct: index === question.answer })),
  });
}
