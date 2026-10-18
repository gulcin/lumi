import type { Rng } from "../rng";
import type { Topic } from "../types";
import type { Exercise } from "./types";
import { choiceExercise, irand, numberExercise, orderExercise, pick, shuffle } from "./util";

const EMOJI = ["🦢", "⭐", "🍎", "🚋", "🌸", "🍪", "🐟", "🌙"];

function nameOf(topic: Topic): string {
  return topic.name.toLowerCase();
}

function magnitude(topic: Topic): number {
  const n = nameOf(topic);
  if (/within 5|up to 5|bonds to 5/.test(n)) return 5;
  if (/within 10|up to 10|bonds to 9|bonds to 10|fluent adding and subtracting within 5/.test(n)) return 10;
  if (/within 20|up to 20|number bonds/.test(n)) return 20;
  if (/within 1000|up to 1000|three-digit|column/.test(n)) return 1000;
  if (/within 100|up to 100|two-digit|tens/.test(n)) return 100;
  if (topic.ageRangeEnd <= 6) return 10;
  if (topic.ageRangeEnd <= 7) return 20;
  if (topic.ageRangeEnd <= 9) return 100;
  if (topic.ageRangeEnd <= 11) return 1000;
  return 1000;
}

function counting(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/more or fewer|compar/.test(n)) {
    const a = irand(rng, 2, 7);
    let b = irand(rng, 2, 7);
    if (b === a) b = a + 1;
    const more = a > b ? "the swans" : "the stars";
    return choiceExercise(topic, rng, "counting", {
      prompt: "Which group has more?",
      speak: `Which group has more? The swans, or the stars?`,
      explain: `${more === "the swans" ? "The swans" : "The stars"} — there are ${Math.max(a, b)}.`,
      visual: { type: "groups", groups: [{ emoji: "🦢", count: a, label: "swans" }, { emoji: "⭐", count: b, label: "stars" }] },
      choices: [
        { label: "The swans", correct: a > b },
        { label: "The stars", correct: b > a },
      ],
    });
  }
  if (/one more|one less|forwards|backwards/.test(n)) {
    const base = irand(rng, 2, topic.ageRangeEnd >= 7 ? 30 : 12);
    const more = !/less|backwards/.test(n);
    const answer = more ? base + 1 : base - 1;
    return numberExercise(topic, rng, "counting", {
      prompt: more ? `What is one more than ${base}?` : `What is one less than ${base}?`,
      speak: more ? `What number is one more than ${base}?` : `What number is one less than ${base}?`,
      explain: more ? `One more than ${base} is ${answer}.` : `One less than ${base} is ${answer}.`,
      answer,
      worked: { op: more ? "+" : "-", a: base, b: 1, answer },
    });
  }
  if (/in 2s|in 5s|in 10s|skip/.test(n)) {
    const step = /5s/.test(n) ? 5 : /10s/.test(n) ? 10 : 2;
    const start = step * irand(rng, 1, 4);
    const seq = [start, start + step, start + step * 2];
    const answer = start + step * 3;
    return numberExercise(topic, rng, "counting", {
      prompt: `Count in ${step}s: ${seq.join(", ")}, …`,
      speak: `Count in ${step}s. ${seq.join(", ")}, what comes next?`,
      explain: `Next is ${answer}.`,
      answer,
      visual: { type: "equation", text: `${seq.join("  ")}  ?` },
    });
  }
  const count = irand(rng, 3, topic.ageRangeEnd >= 7 ? 12 : 8);
  const emoji = pick(rng, EMOJI);
  return numberExercise(topic, rng, "counting", {
    prompt: "How many?",
    speak: "How many do you see?",
    explain: `There are ${count}.`,
    answer: count,
    visual: { type: "count", emoji, count },
    worked: { op: "+", a: count, b: 0, answer: count },
  });
}

function addSub(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  const max = magnitude(topic);
  if (/missing|unknown|equation|equals/.test(n) && rng() < 0.7) {
    const answer = irand(rng, 0, Math.min(max, 20));
    const a = irand(rng, 0, Math.min(max, 20) - answer);
    const total = a + answer;
    return numberExercise(topic, rng, "addition", {
      prompt: `${a} + □ = ${total}`,
      speak: `${a} plus what equals ${total}?`,
      explain: `${a} plus ${answer} equals ${total}.`,
      answer,
      visual: { type: "equation", text: `${a} + □ = ${total}` },
      worked: { op: "eq", a, b: total, answer },
    });
  }
  if (/bond|pairs/.test(n) || (max <= 20 && rng() < 0.35)) {
    const named = /\bto (\d+)\b/.exec(n);
    const target = named ? Number(named[1]) : max <= 5 ? 5 : max <= 10 ? 10 : 20;
    const a = irand(rng, 0, target);
    const answer = target - a;
    return numberExercise(topic, rng, "bonds", {
      prompt: `${a} and what makes ${target}?`,
      speak: `What goes with ${a} to make ${target}?`,
      explain: `${a} and ${answer} make ${target}.`,
      answer,
      visual: { type: "equation", text: `${a} + ? = ${target}` },
      worked: { op: "+", a, b: answer, answer: target },
    });
  }
  const subtract = /subtract|minus|taking away|difference|left/.test(n) ? true : /add|plus|altogether|sum|combin/.test(n) ? false : rng() < 0.45;
  if (subtract) {
    const a = irand(rng, 1, max);
    const b = irand(rng, 0, a);
    const answer = a - b;
    if (rng() < 0.45) {
      const apples = a === 1 ? "1 apple" : `${a} apples`;
      const eaten = b === 1 ? "1 was" : `${b} were`;
      return numberExercise(topic, rng, "subtraction", {
        prompt: `There ${a === 1 ? "was" : "were"} ${apples}. ${eaten} eaten. How many are left?`,
        speak: `There ${a === 1 ? "was" : "were"} ${apples}. ${eaten} eaten. How many are left?`,
        explain: `${a} minus ${b} is ${answer}.`,
        answer,
        worked: { op: "-", a, b, answer },
      });
    }
    return numberExercise(topic, rng, "subtraction", {
      prompt: `${a} − ${b}`,
      speak: `What is ${a} minus ${b}?`,
      explain: `${a} minus ${b} is ${answer}.`,
      answer,
      visual: { type: "equation", text: `${a} − ${b}` },
      worked: { op: "-", a, b, answer },
    });
  }
  const a = irand(rng, 0, max);
  const b = irand(rng, 0, max);
  const answer = a + b;
  if (rng() < 0.4) {
    return numberExercise(topic, rng, "addition", {
      prompt: `Lumi counted ${a} swans, then ${b} more landed. How many swans?`,
      speak: `Lumi counted ${a} swans, then ${b} more landed. How many swans now?`,
      explain: `${a} plus ${b} is ${answer}.`,
      answer,
      worked: { op: "+", a, b, answer },
    });
  }
  return numberExercise(topic, rng, "addition", {
    prompt: `${a} + ${b}`,
    speak: `What is ${a} plus ${b}?`,
    explain: `${a} plus ${b} is ${answer}.`,
    answer,
    visual: { type: "equation", text: `${a} + ${b}` },
    worked: { op: "+", a, b, answer },
  });
}

function mulDiv(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  const age = topic.ageRangeEnd;
  if (/odd and even|odd|even/.test(n) && !/product/.test(n)) {
    const value = irand(rng, 1, 30);
    const even = value % 2 === 0;
    return choiceExercise(topic, rng, "odds", {
      prompt: `Is ${value} odd or even?`,
      speak: `Is ${value} odd or even?`,
      explain: even ? `${value} is even. It splits into twos.` : `${value} is odd. One is left over.`,
      choices: [
        { label: "Even", correct: even },
        { label: "Odd", correct: !even },
      ],
    });
  }
  if (/multi-step|two-step/.test(n)) {
    const groups = irand(rng, 2, 6);
    const each = irand(rng, 2, 6);
    const extra = irand(rng, 1, 5);
    const product = groups * each;
    const answer = each + extra;
    return numberExercise(topic, rng, "division", {
      prompt: `${product} ÷ ${groups} + ${extra}`,
      speak: `What is ${product} divided by ${groups}, plus ${extra}?`,
      explain: `${product} ÷ ${groups} is ${each}. Then ${each} + ${extra} is ${answer}.`,
      answer,
      visual: { type: "equation", text: `${product} ÷ ${groups} + ${extra}` },
      worked: { op: "+", a: each, b: extra, answer },
    });
  }
  const namedDivision = /divi|shar|group/.test(n) && !/repeated addition|times|multipl/.test(n);
  const namedMultiply = /times|multipl|product|array|repeated/.test(n) && !/divi|shar/.test(n);
  const division = namedDivision ? true : namedMultiply ? false : rng() < 0.35 && age >= 7;
  if (/array|repeated/.test(n) && !division) {
    const rows = irand(rng, 2, 4);
    const cols = irand(rng, 2, age >= 8 ? 6 : 4);
    const answer = rows * cols;
    return numberExercise(topic, rng, "multiplication", {
      prompt: `${rows} rows of ${cols}. How many altogether?`,
      speak: `There are ${rows} rows of ${cols}. How many altogether?`,
      explain: `${rows} times ${cols} is ${answer}.`,
      answer,
      visual: { type: "count", emoji: "🔵", count: answer },
      worked: { op: "*", a: rows, b: cols, answer },
    });
  }
  const tableMax = age <= 7 ? 5 : age <= 9 ? 10 : 12;
  const a = irand(rng, 2, tableMax);
  const b = irand(rng, age >= 10 && /two-digit|long|column|3-digit|large/.test(n) ? 10 : 1, age >= 10 && /two-digit|long|column/.test(n) ? 25 : age <= 7 ? 5 : 12);
  if (division) {
    const product = a * b;
    return numberExercise(topic, rng, "division", {
      prompt: age <= 7 ? `Share ${product} cookies between ${a} friends. How many each?` : `${product} ÷ ${a}`,
      speak: age <= 7 ? `Share ${product} cookies between ${a} friends. How many does each friend get?` : `What is ${product} divided by ${a}?`,
      explain: `${product} divided by ${a} is ${b}.`,
      answer: b,
      visual: age > 7 ? { type: "equation", text: `${product} ÷ ${a}` } : undefined,
      worked: { op: "/", a: product, b: a, answer: b },
    });
  }
  if (age >= 11 && rng() < 0.4) {
    const x = irand(rng, 12, 40);
    const y = irand(rng, 3, 9);
    const answer = x * y;
    return numberExercise(topic, rng, "multiplication", {
      prompt: `${x} × ${y}`,
      speak: `What is ${x} times ${y}?`,
      explain: `${x} times ${y} is ${answer}.`,
      answer,
      visual: { type: "equation", text: `${x} × ${y}` },
      worked: { op: "*", a: x, b: y, answer },
    });
  }
  const answer = a * b;
  return numberExercise(topic, rng, "multiplication", {
    prompt: `${a} × ${b}`,
    speak: `What is ${a} times ${b}?`,
    explain: `${a} times ${b} is ${answer}.`,
    answer,
    visual: { type: "equation", text: `${a} × ${b}` },
    worked: { op: "*", a, b, answer },
  });
}

function fractions(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/decimal/.test(n)) return decimals(topic, rng);
  if (/percent/.test(n)) return percent(topic, rng);
  if (/half|quarter|halves/.test(n) && topic.ageRangeEnd <= 8) {
    const parts = /quarter/.test(n) && rng() < 0.5 ? 4 : rng() < 0.5 ? 2 : 4;
    const filled = parts === 2 ? 1 : 1;
    const label = parts === 2 ? "1/2" : "1/4";
    return choiceExercise(topic, rng, "fractions", {
      prompt: "Which fraction is shaded?",
      speak: "Which fraction is shaded?",
      explain: `${filled} of ${parts} equal parts is shaded. That is ${label}.`,
      visual: { type: "fraction", parts, filled },
      choices: [
        { label: "1/2", correct: parts === 2 },
        { label: "1/4", correct: parts === 4 },
        { label: "3/4", correct: false },
      ],
    });
  }
  if (/equivalent/.test(n)) {
    return choiceExercise(topic, rng, "fractions", {
      prompt: "Which fraction equals 1/2?",
      speak: "Which fraction is the same as one half?",
      explain: "2/4 is the same as 1/2. Both are half of a whole.",
      choices: [
        { label: "2/4", correct: true },
        { label: "1/4", correct: false },
        { label: "1/3", correct: false },
        { label: "2/3", correct: false },
      ],
    });
  }
  if (/add|sum|subtract|calculat/.test(n) && topic.ageRangeEnd >= 8) {
    const den = pick(rng, [5, 6, 8, 10]);
    const a = irand(rng, 1, Math.max(1, den - 2));
    const b = irand(rng, 1, Math.max(1, den - a));
    const subtract = /subtract/.test(n);
    const left = subtract ? a + b : a;
    const right = subtract ? a : b;
    const answerN = subtract ? b : a + b;
    return choiceExercise(topic, rng, "fractions", {
      prompt: `${left}/${den} ${subtract ? "−" : "+"} ${right}/${den}`,
      speak: `What is ${left} over ${den} ${subtract ? "minus" : "plus"} ${right} over ${den}?`,
      explain: `The denominator stays ${den}. ${left} ${subtract ? "minus" : "plus"} ${right} is ${answerN}, so the answer is ${answerN}/${den}.`,
      choices: [
        { label: `${answerN}/${den}`, correct: true },
        { label: `${answerN}/${den * 2}`, correct: false },
        { label: `${answerN + 1}/${den}`, correct: false },
      ],
    });
  }
  if (/of an amount|of amounts|fraction of/.test(n) || topic.ageRangeEnd >= 7) {
    const den = pick(rng, [2, 4, 5]);
    const whole = den * irand(rng, 2, 6);
    const num = den === 2 ? 1 : 1;
    const answer = (whole / den) * num;
    return numberExercise(topic, rng, "fractions", {
      prompt: `What is ${num}/${den} of ${whole}?`,
      speak: `What is ${num} ${den === 2 ? "half" : den === 4 ? "quarter" : "fifth"} of ${whole}?`,
      explain: `${whole} split into ${den} is ${whole / den}.`,
      answer,
      visual: { type: "fraction", parts: den, filled: num },
      worked: { op: "/", a: whole, b: den, answer },
    });
  }
  const whole = pick(rng, [4, 6, 8, 10]);
  return numberExercise(topic, rng, "fractions", {
    prompt: `What is half of ${whole}?`,
    speak: `What is half of ${whole}?`,
    explain: `Half of ${whole} is ${whole / 2}.`,
    answer: whole / 2,
    visual: { type: "fraction", parts: 2, filled: 1 },
    worked: { op: "/", a: whole, b: 2, answer: whole / 2 },
  });
}

function decimals(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/compar|greater|order/.test(n)) {
    const bigger = pick(rng, [0.5, 0.8, 0.4]);
    const smaller = Number((bigger - 0.15).toFixed(2));
    return choiceExercise(topic, rng, "decimals", {
      prompt: "Which decimal is greater?",
      speak: `Which is greater, ${bigger} or ${smaller}?`,
      explain: `${bigger} is greater than ${smaller}.`,
      choices: [
        { label: String(bigger), correct: true },
        { label: String(smaller), correct: false },
      ],
    });
  }
  if (/equivalent/.test(n)) {
    const tenths = irand(rng, 1, 9);
    const same = (tenths / 10).toFixed(1);
    const smaller = (tenths / 100).toFixed(2);
    const neighbour = ((tenths % 9) + 1) / 10;
    return choiceExercise(topic, rng, "decimals", {
      prompt: `Which decimal is the same as ${tenths}/10?`,
      speak: `Which decimal is the same as ${tenths} tenths?`,
      explain: `${tenths}/10 is ${same}.`,
      choices: [
        { label: same, correct: true },
        { label: smaller, correct: false },
        { label: neighbour.toFixed(1), correct: false },
      ],
    });
  }
  if (/hundredth|three places|place value/.test(n) && rng() < 0.5) {
    const answer = irand(rng, 1, 9);
    return numberExercise(topic, rng, "decimals", {
      prompt: "How many hundredths are in 0." + String(answer).padStart(2, "0") + "?",
      speak: `How many hundredths are shown in the decimal zero point ${String(answer).padStart(2, "0").split("").join(" ")}?`,
      explain: `That decimal has ${answer} hundredths.`,
      answer,
    });
  }
  const a = irand(rng, 1, 9) / 10;
  const b = irand(rng, 1, 9) / 10;
  const subtract = /subtract|difference/.test(n) ? true : a + b > 1.2;
  if (subtract && a >= b) {
    const answer = Number((a - b).toFixed(1));
    return numberExercise(topic, rng, "decimals", {
      prompt: `${a.toFixed(1)} − ${b.toFixed(1)}`,
      speak: `What is ${a.toFixed(1)} minus ${b.toFixed(1)}?`,
      explain: `${a.toFixed(1)} minus ${b.toFixed(1)} is ${answer.toFixed(1)}.`,
      answer,
      numeric: "decimal",
      visual: { type: "equation", text: `${a.toFixed(1)} − ${b.toFixed(1)}` },
      worked: { op: "-", a, b, answer },
    });
  }
  const answer = Number((a + b).toFixed(1));
  return numberExercise(topic, rng, "decimals", {
    prompt: `${a.toFixed(1)} + ${b.toFixed(1)}`,
    speak: `What is ${a.toFixed(1)} plus ${b.toFixed(1)}?`,
    explain: `${a.toFixed(1)} plus ${b.toFixed(1)} is ${answer.toFixed(1)}.`,
    answer,
    numeric: "decimal",
    visual: { type: "equation", text: `${a.toFixed(1)} + ${b.toFixed(1)}` },
    worked: { op: "+", a, b, answer },
  });
}

function percent(topic: Topic, rng: Rng): Exercise {
  const rate = pick(rng, [10, 25, 50]);
  const whole = rate === 25 ? pick(rng, [20, 40, 80]) : rate === 50 ? pick(rng, [10, 18, 40]) : pick(rng, [20, 30, 50, 70]);
  const answer = (rate / 100) * whole;
  return numberExercise(topic, rng, "percent", {
    prompt: `What is ${rate}% of ${whole}?`,
    speak: `What is ${rate} percent of ${whole}?`,
    explain: `${rate}% of ${whole} is ${answer}.`,
    answer,
    worked: { op: "pct", a: rate, b: whole, answer },
  });
}

function ratio(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/percent/.test(n)) return percent(topic, rng);
  if (/conversion|unit/.test(n)) return conversion(topic, rng);
  if (/scale|similar/.test(n)) {
    const scale = pick(rng, [2, 3, 5]);
    const drawn = irand(rng, 2, 6);
    const answer = drawn * scale;
    return numberExercise(topic, rng, "ratio", {
      prompt: `On a map, 1 cm stands for ${scale} cm. A line of ${drawn} cm stands for how many centimetres?`,
      speak: `One centimetre stands for ${scale} centimetres. How long is ${drawn} centimetres on the map, in real centimetres?`,
      explain: `${drawn} times ${scale} is ${answer}.`,
      answer,
      worked: { op: "*", a: drawn, b: scale, answer },
    });
  }
  const partA = pick(rng, [1, 2]);
  let partB = pick(rng, [2, 3, 4]);
  if (partB === partA) partB += 1;
  const share = irand(rng, 2, 5);
  const total = (partA + partB) * share;
  const bigger = Math.max(partA, partB) * share;
  return numberExercise(topic, rng, "ratio", {
    prompt: `Share ${total} in the ratio ${partA}:${partB}. How many are in the larger share?`,
    speak: `Share ${total} in the ratio ${partA} to ${partB}. How many are in the larger share?`,
    explain: `Each part is ${share}. The larger share is ${bigger}.`,
    answer: bigger,
    worked: { op: "*", a: Math.max(partA, partB), b: share, answer: bigger },
  });
}

function placeValue(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/decimal/.test(n)) return decimals(topic, rng);
  if (/negative/.test(n)) {
    const answer = -irand(rng, 1, 12);
    const from = irand(rng, 1, 8);
    return numberExercise(topic, rng, "place", {
      prompt: `The temperature was ${from}°. It fell by ${from - answer}°. What is it now?`,
      speak: `The temperature was ${from} degrees. It fell by ${from - answer} degrees. What is the temperature now?`,
      explain: `It fell below zero to ${answer}.`,
      answer,
      numeric: "negative",
      worked: { op: "-", a: from, b: from - answer, answer },
    });
  }
  if (/10 more|ten more|10 less|ten less/.test(n)) {
    const base = irand(rng, 2, 8) * 10 + irand(rng, 0, 9);
    const more = /less/.test(n) ? false : true;
    const answer = more ? base + 10 : base - 10;
    return numberExercise(topic, rng, "place", {
      prompt: more ? `What is 10 more than ${base}?` : `What is 10 less than ${base}?`,
      speak: more ? `What is ten more than ${base}?` : `What is ten less than ${base}?`,
      explain: more ? `10 more than ${base} is ${answer}.` : `10 less than ${base} is ${answer}.`,
      answer,
      worked: { op: more ? "+" : "-", a: base, b: 10, answer },
    });
  }
  if (/compar|order/.test(n)) {
    const unique: number[] = [];
    while (unique.length < 3) {
      const next = irand(rng, 10, 99);
      if (!unique.includes(next)) unique.push(next);
    }
    const sorted = [...unique].sort((a, b) => a - b);
    return orderExercise(topic, rng, "place", {
      prompt: "Tap the numbers from smallest to largest.",
      speak: `Tap these numbers from smallest to largest. ${sorted.join(", ")}.`,
      explain: `Smallest to largest is ${sorted.join(", ")}.`,
      labels: sorted.map(String),
    });
  }
  const hundreds = topic.ageRangeEnd >= 8 ? irand(rng, 1, 9) : 0;
  const tens = irand(rng, 1, 9);
  const ones = irand(rng, 0, 9);
  if (/number word|words to/.test(n)) {
    const words = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
    const value = irand(rng, 0, 20);
    return numberExercise(topic, rng, "place", {
      prompt: `What number is the word ${words[value]}?`,
      speak: `What number is the word ${words[value]}?`,
      explain: `${words[value]} is ${value}.`,
      answer: value,
    });
  }
  if (/teen/.test(n)) {
    const teen = irand(rng, 11, 19);
    return numberExercise(topic, rng, "place", {
      prompt: `${teen} is 10 and how many ones?`,
      speak: `${teen} is one ten and how many ones?`,
      explain: `${teen} is 10 plus ${teen - 10}.`,
      answer: teen - 10,
      visual: { type: "place", hundreds: 0, tens: 1, ones: teen - 10 },
    });
  }
  const askTens = rng() < 0.5 || hundreds === 0;
  if (askTens && hundreds === 0) {
    return numberExercise(topic, rng, "place", {
      prompt: `How many tens are in ${tens * 10 + ones}?`,
      speak: `How many tens are in ${tens * 10 + ones}?`,
      explain: `${tens * 10 + ones} has ${tens} tens and ${ones} ones.`,
      answer: tens,
      visual: { type: "place", hundreds: 0, tens, ones },
    });
  }
  const value = hundreds * 100 + tens * 10 + ones;
  return numberExercise(topic, rng, "place", {
    prompt: `What is the value of the ${hundreds ? "hundreds" : "tens"} digit in ${value}?`,
    speak: hundreds
      ? `In ${value}, what is the hundreds digit worth?`
      : `In ${value}, how many tens are there?`,
    explain: hundreds ? `The hundreds digit is ${hundreds}, worth ${hundreds * 100}.` : `There are ${tens} tens.`,
    answer: hundreds ? hundreds * 100 : tens,
    visual: { type: "place", hundreds, tens, ones },
  });
}

const SHAPES = [
  { name: "circle", sides: 0 },
  { name: "triangle", sides: 3 },
  { name: "square", sides: 4 },
  { name: "rectangle", sides: 4 },
  { name: "pentagon", sides: 5 },
  { name: "hexagon", sides: 6 },
];

function geometry(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/perimeter/.test(n)) {
    const length = irand(rng, 3, 12);
    const width = irand(rng, 2, 8);
    const answer = topic.ageRangeEnd >= 9 && /rectangle|compound|rectilinear/.test(n) ? 2 * (length + width) : length * 4;
    if (answer === length * 4 && !/rectangle/.test(n)) {
      return numberExercise(topic, rng, "geometry", {
        prompt: `A square has sides of ${length} cm. What is the perimeter?`,
        speak: `A square has sides of ${length} centimetres. What is the perimeter?`,
        explain: `Four sides of ${length} make ${length * 4}.`,
        answer: length * 4,
        worked: { op: "*", a: length, b: 4, answer: length * 4 },
      });
    }
    return numberExercise(topic, rng, "geometry", {
      prompt: `A rectangle is ${length} cm by ${width} cm. What is the perimeter?`,
      speak: `A rectangle is ${length} centimetres by ${width} centimetres. What is the perimeter?`,
      explain: `Go all the way around: ${answer} centimetres.`,
      answer,
      worked: { op: "*", a: length + width, b: 2, answer },
    });
  }
  if (/area/.test(n)) {
    const length = irand(rng, 2, 9);
    const width = irand(rng, 2, 6);
    const answer = length * width;
    return numberExercise(topic, rng, "geometry", {
      prompt: `A rectangle is ${length} cm by ${width} cm. What is the area in square centimetres?`,
      speak: `A rectangle is ${length} by ${width}. What is the area?`,
      explain: `${length} times ${width} is ${answer}.`,
      answer,
      worked: { op: "*", a: length, b: width, answer },
    });
  }
  if (/angle|degree/.test(n)) {
    if (/triangle/.test(n) && topic.ageRangeEnd >= 8) {
      const a = pick(rng, [40, 50, 60, 70]);
      const b = pick(rng, [30, 40, 55]);
      const answer = 180 - a - b;
      return numberExercise(topic, rng, "geometry", {
        prompt: `Two angles in a triangle are ${a}° and ${b}°. What is the third?`,
        speak: `Two angles are ${a} degrees and ${b} degrees. What is the third angle?`,
        explain: `Angles in a triangle add up to 180. The third is ${answer}.`,
        answer,
        worked: { op: "-", a: 180, b: a + b, answer },
      });
    }
    return choiceExercise(topic, rng, "geometry", {
      prompt: "How many degrees are in a right angle?",
      speak: "How many degrees are in a right angle?",
      explain: "A right angle is 90 degrees. It looks like the corner of a book.",
      choices: [
        { label: "90°", correct: true },
        { label: "45°", correct: false },
        { label: "180°", correct: false },
      ],
    });
  }
  if (/coordinate|plot|quadrant|grid/.test(n)) {
    const x = irand(rng, 0, 6);
    const y = irand(rng, 0, 6);
    return numberExercise(topic, rng, "geometry", {
      prompt: `Point (${x}, ${y}). How far across is it?`,
      speak: `The point is ${x}, ${y}. The first number is how far across. What is it?`,
      explain: `The first number, ${x}, tells you how far across.`,
      answer: x,
      visual: { type: "equation", text: `(${x}, ${y})` },
    });
  }
  if (/3-d|3d|solid|face|net|cube|sphere/.test(n)) {
    return choiceExercise(topic, rng, "geometry", {
      prompt: "Which shape can roll smoothly?",
      speak: "Which shape can roll smoothly?",
      explain: "A sphere rolls. A cube slides on its flat faces.",
      choices: [
        { label: "Sphere", emoji: "⚪", correct: true },
        { label: "Cube", emoji: "🧊", correct: false },
        { label: "Square pyramid", correct: false },
      ],
    });
  }
  if (/position|left|right|direction|turn/.test(n)) {
    return choiceExercise(topic, rng, "geometry", {
      prompt: "The tram is in front of the castle. Where is the castle?",
      speak: "The tram is in front of the castle. Where is the castle, compared with the tram?",
      explain: "If the tram is in front of the castle, the castle is behind the tram.",
      choices: [
        { label: "Behind the tram", correct: true },
        { label: "Inside the tram", correct: false },
        { label: "Under the tram", correct: false },
      ],
    });
  }
  const shape = pick(rng, SHAPES.filter((item) => (topic.ageRangeEnd < 7 ? item.sides <= 4 : true)));
  if (shape.sides > 0 && rng() < 0.55) {
    return numberExercise(topic, rng, "geometry", {
      prompt: `How many sides does a ${shape.name} have?`,
      speak: `How many sides does a ${shape.name} have?`,
      explain: `A ${shape.name} has ${shape.sides} sides.`,
      answer: shape.sides,
      visual: { type: "shape", name: shape.name },
    });
  }
  const options = shuffle(rng, SHAPES).slice(0, 3);
  if (!options.some((item) => item.name === shape.name)) options[0] = shape;
  return choiceExercise(topic, rng, "geometry", {
    prompt: "What shape is this?",
    speak: "What shape is this?",
    explain: `This is a ${shape.name}.`,
    visual: { type: "shape", name: shape.name },
    choices: options.map((item) => ({ label: item.name, correct: item.name === shape.name })),
  });
}

function measurement(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/money|coin|change|price|cost|budget|kč|pound|pence/.test(n) || topic.domain === "Money & Finance") return money(topic, rng);
  if (/time|clock|hour|minute|day|week|month|duration|interval/.test(n)) return time(topic, rng);
  if (/capacity|litre|volume|holds/.test(n)) {
    if (topic.ageRangeEnd >= 8) {
      const litres = irand(rng, 1, 4);
      return numberExercise(topic, rng, "measure", {
        prompt: `How many millilitres are in ${litres} L?`,
        speak: `How many millilitres are in ${litres} litres?`,
        explain: `1 litre is 1000 millilitres, so ${litres * 1000}.`,
        answer: litres * 1000,
        worked: { op: "*", a: litres, b: 1000, answer: litres * 1000 },
      });
    }
    return choiceExercise(topic, rng, "measure", {
      prompt: "Which holds more?",
      speak: "Which holds more, a bucket or a cup?",
      explain: "A bucket holds more than a cup.",
      choices: [
        { label: "A bucket", emoji: "🪣", correct: true },
        { label: "A cup", emoji: "🥤", correct: false },
      ],
    });
  }
  if (/convert|centimetre|metre|gram|kilogram|capacity|litre|mass|length/.test(n) && topic.ageRangeEnd >= 7) return conversion(topic, rng);
  return choiceExercise(topic, rng, "measure", {
    prompt: "Which is longer?",
    speak: "Which is longer, the tram or the key?",
    explain: "A tram is much longer than a key.",
    choices: [
      { label: "A tram", emoji: "🚋", correct: true },
      { label: "A key", emoji: "🔑", correct: false },
    ],
  });
}

function money(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (topic.ageRangeEnd >= 9 || /change|budget|cost/.test(n)) {
    const price = pick(rng, [18, 25, 36, 42, 65]);
    const paid = price <= 50 ? 50 : 100;
    const answer = paid - price;
    return numberExercise(topic, rng, "money", {
      prompt: `A bun costs ${price} Kč. You pay with ${paid} Kč. How much change?`,
      speak: `A bun costs ${price} koruna. You pay with ${paid} koruna. How much change do you get?`,
      explain: `${paid} minus ${price} is ${answer} Kč.`,
      answer,
      worked: { op: "-", a: paid, b: price, answer },
    });
  }
  const coins = shuffle(rng, [1, 2, 5, 10, 20]).slice(0, irand(rng, 2, 3));
  const answer = coins.reduce((sum, coin) => sum + coin, 0);
  return numberExercise(topic, rng, "money", {
    prompt: "How many Kč altogether?",
    speak: `How many koruna altogether? You have coins of ${coins.join(", ")}.`,
    explain: `${coins.join(" + ")} = ${answer} Kč.`,
    answer,
    visual: { type: "coins", values: coins },
    worked: { op: "+", a: coins[0] ?? 0, b: answer - (coins[0] ?? 0), answer },
  });
}

function time(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/compar/.test(n)) {
    const shorter = pick(rng, [10, 15, 20, 30]);
    const longer = shorter + pick(rng, [15, 30, 45]);
    return choiceExercise(topic, rng, "time", {
      prompt: `Which lasts longer, ${shorter} minutes or ${longer} minutes?`,
      speak: `Which lasts longer, ${shorter} minutes or ${longer} minutes?`,
      explain: `${longer} minutes is more than ${shorter} minutes.`,
      choices: [
        { label: `${longer} minutes`, correct: true },
        { label: `${shorter} minutes`, correct: false },
        { label: "They are the same", correct: false },
      ],
    });
  }
  if (/order/.test(n)) {
    return orderExercise(topic, rng, "time", {
      prompt: "Tap the parts of the day in order, starting from morning.",
      speak: "Tap the parts of the day in order, starting from morning.",
      explain: "Morning comes first, then afternoon, then evening.",
      labels: ["Morning", "Afternoon", "Evening"],
    });
  }
  if (/minutes in an hour|number of minutes/.test(n)) {
    const hours = irand(rng, 1, 4);
    return numberExercise(topic, rng, "time", {
      prompt: `How many minutes are in ${hours} ${hours === 1 ? "hour" : "hours"}?`,
      speak: `How many minutes are in ${hours} ${hours === 1 ? "hour" : "hours"}?`,
      explain: `Each hour has 60 minutes, so ${hours * 60}.`,
      answer: hours * 60,
      worked: { op: "*", a: hours, b: 60, answer: hours * 60 },
    });
  }
  if (/12-hour|24-hour/.test(n)) {
    return choiceExercise(topic, rng, "time", {
      prompt: "Which time is the same as 3 o'clock in the afternoon?",
      speak: "Which time is the same as 3 o'clock in the afternoon?",
      explain: "In the 24-hour clock, 3 in the afternoon is 15:00.",
      choices: [
        { label: "15:00", correct: true },
        { label: "03:00", correct: false },
        { label: "3:00 at night only", correct: false },
      ],
    });
  }
  if (/day|week|month|year|calendar|unit/.test(n) && !/hour|minute/.test(n)) {
    return orderExercise(topic, rng, "time", {
      prompt: "Tap the days in order, starting from Monday.",
      speak: "Tap the days in order, starting from Monday.",
      explain: "Monday, Tuesday, Wednesday, Thursday.",
      labels: ["Monday", "Tuesday", "Wednesday", "Thursday"],
    });
  }
  if (/elapsed|interval|later|earlier|duration/.test(n)) {
    const mins = pick(rng, [15, 20, 30, 45]);
    return numberExercise(topic, rng, "time", {
      prompt: `A lesson starts at 2:00 and lasts ${mins} minutes. How many minutes past 2 does it end?`,
      speak: `A lesson starts at 2 o'clock and lasts ${mins} minutes. How many minutes past 2 does it end?`,
      explain: `It ends at ${mins} minutes past 2.`,
      answer: mins,
    });
  }
  const hour = irand(rng, 1, 12);
  const halfOnly = /half hours?/.test(n) || topic.ageRangeEnd <= 6;
  const minute = halfOnly ? pick(rng, [0, 30]) : pick(rng, [0, 15, 30, 45]);
  if (minute === 0) {
    return numberExercise(topic, rng, "time", {
      prompt: "What hour is it?",
      speak: "What hour does the clock show?",
      explain: `The short hand is on ${hour}. It is ${hour} o'clock.`,
      answer: hour,
      visual: { type: "clock", hour, minute },
    });
  }
  const spokenHour = minute === 45 ? (hour % 12) + 1 : hour;
  const spoken = minute === 30 ? `half past ${hour}` : minute === 15 ? `quarter past ${hour}` : `quarter to ${spokenHour}`;
  const other = minute === 30 ? `quarter past ${hour}` : `half past ${hour}`;
  return choiceExercise(topic, rng, "time", {
    prompt: "What time is it?",
    speak: "What time does the clock show?",
    explain: `This is ${spoken}.`,
    visual: { type: "clock", hour, minute },
    choices: [
      { label: spoken, correct: true },
      { label: `${hour} o'clock`, correct: false },
      { label: other, correct: false },
    ],
  });
}

function conversion(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/minute|hour|time/.test(n)) {
    const hours = irand(rng, 1, 4);
    return numberExercise(topic, rng, "measure", {
      prompt: `How many minutes are in ${hours} ${hours === 1 ? "hour" : "hours"}?`,
      speak: `How many minutes are in ${hours} ${hours === 1 ? "hour" : "hours"}?`,
      explain: `Each hour has 60 minutes, so ${hours * 60}.`,
      answer: hours * 60,
      worked: { op: "*", a: hours, b: 60, answer: hours * 60 },
    });
  }
  if (/gram|mass|weight|kg/.test(n)) {
    const kg = irand(rng, 1, 4);
    return numberExercise(topic, rng, "measure", {
      prompt: `How many grams are in ${kg} kg?`,
      speak: `How many grams are in ${kg} kilograms?`,
      explain: `1 kilogram is 1000 grams, so ${kg * 1000}.`,
      answer: kg * 1000,
      worked: { op: "*", a: kg, b: 1000, answer: kg * 1000 },
    });
  }
  const metres = irand(rng, 1, 5);
  return numberExercise(topic, rng, "measure", {
    prompt: `How many centimetres are in ${metres} m?`,
    speak: `How many centimetres are in ${metres} metres?`,
    explain: `1 metre is 100 centimetres, so ${metres * 100}.`,
    answer: metres * 100,
    worked: { op: "*", a: metres, b: 100, answer: metres * 100 },
  });
}

function algebra(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (/sequence|pattern|nth|term/.test(n)) {
    const step = irand(rng, 2, 6);
    const start = irand(rng, 1, 8);
    const seq = [start, start + step, start + step * 2, start + step * 3];
    const answer = start + step * 4;
    return numberExercise(topic, rng, "algebra", {
      prompt: `What comes next? ${seq.join(", ")}, …`,
      speak: `What comes next? ${seq.join(", ")}.`,
      explain: `The pattern adds ${step} each time. Next is ${answer}.`,
      answer,
      visual: { type: "equation", text: seq.join("  ") + "  ?" },
      worked: { op: "+", a: seq[3] ?? 0, b: step, answer },
    });
  }
  if (/substitut|formula|formulae/.test(n)) {
    const nVal = irand(rng, 2, 8);
    const coef = irand(rng, 2, 5);
    const extra = irand(rng, 0, 6);
    const answer = coef * nVal + extra;
    return numberExercise(topic, rng, "algebra", {
      prompt: `If n = ${nVal}, what is ${coef}n + ${extra}?`,
      speak: `If n equals ${nVal}, what is ${coef} n plus ${extra}?`,
      explain: `${coef} times ${nVal} is ${coef * nVal}, plus ${extra} is ${answer}.`,
      answer,
      visual: { type: "equation", text: `${coef}n + ${extra}` },
      worked: { op: "+", a: coef * nVal, b: extra, answer },
    });
  }
  if (/like terms|collect/.test(n)) {
    const a = irand(rng, 2, 6);
    const b = irand(rng, 2, 6);
    const correct = `${a + b}a`;
    const wrongs = [`${a + b}`, `${a * b}a`, `${a}a + ${b}`, `${b}a + ${a}`].filter((label, index, all) => label !== correct && all.indexOf(label) === index);
    return choiceExercise(topic, rng, "algebra", {
      prompt: `Simplify ${a}a + ${b}a`,
      speak: `Simplify ${a} a plus ${b} a.`,
      explain: `${a}a plus ${b}a is ${correct}.`,
      visual: { type: "equation", text: `${a}a + ${b}a` },
      choices: [{ label: correct, correct: true }, ...wrongs.slice(0, 2).map((label) => ({ label, correct: false }))],
    });
  }
  if (/bracket|expand/.test(n)) {
    const m = irand(rng, 2, 5);
    const c = irand(rng, 1, 6);
    const correct = `${m}x + ${m * c}`;
    const wrongs = [`${m}x + ${c}`, `x + ${m * c}`, `${m}x + ${m + c}`, `${m + c}x`].filter(
      (label, index, all) => label !== correct && all.indexOf(label) === index,
    );
    return choiceExercise(topic, rng, "algebra", {
      prompt: `Expand ${m}(x + ${c})`,
      speak: `Expand ${m} times the bracket x plus ${c}.`,
      explain: `${m} times x is ${m}x, and ${m} times ${c} is ${m * c}.`,
      choices: [{ label: correct, correct: true }, ...wrongs.slice(0, 2).map((label) => ({ label, correct: false }))],
    });
  }
  if (/graph|plot|coordinate/.test(n)) {
    const x = irand(rng, -2, 4);
    return numberExercise(topic, rng, "algebra", {
      prompt: `On the line y = x + 1, when x = ${x}, what is y?`,
      speak: `When x is ${x}, and y equals x plus 1, what is y?`,
      explain: `${x} plus 1 is ${x + 1}.`,
      answer: x + 1,
      numeric: x + 1 < 0 ? "negative" : "int",
      visual: { type: "equation", text: "y = x + 1" },
      worked: { op: "+", a: x, b: 1, answer: x + 1 },
    });
  }
  if (/two-step|2-step/.test(n)) {
    const nVal = irand(rng, 2, 8);
    const coef = irand(rng, 2, 4);
    const extra = irand(rng, 1, 6);
    const total = coef * nVal + extra;
    return numberExercise(topic, rng, "algebra", {
      prompt: `${coef}n + ${extra} = ${total}. What is n?`,
      speak: `${coef} n plus ${extra} equals ${total}. What is n?`,
      explain: `Take away ${extra} to get ${total - extra}, then divide by ${coef}. n is ${nVal}.`,
      answer: nVal,
      visual: { type: "equation", text: `${coef}n + ${extra} = ${total}` },
      worked: { op: "/", a: total - extra, b: coef, answer: nVal },
    });
  }
  if (/simultaneous|two unknown/.test(n)) {
    const x = irand(rng, 1, 8);
    const y = irand(rng, 1, 8);
    return numberExercise(topic, rng, "algebra", {
      prompt: `x + y = ${x + y} and x = ${x}. What is y?`,
      speak: `x plus y equals ${x + y}, and x equals ${x}. What is y?`,
      explain: `y is ${y}, because ${x} plus ${y} is ${x + y}.`,
      answer: y,
      visual: { type: "equation", text: `x + y = ${x + y}` },
      worked: { op: "-", a: x + y, b: x, answer: y },
    });
  }
  const a = irand(rng, 1, 12);
  const answer = irand(rng, 0, 12);
  const total = a + answer;
  return numberExercise(topic, rng, "algebra", {
    prompt: `n + ${a} = ${total}. What is n?`,
    speak: `n plus ${a} equals ${total}. What is n?`,
    explain: `n is ${answer}.`,
    answer,
    visual: { type: "equation", text: `n + ${a} = ${total}` },
    worked: { op: "eq", a, b: total, answer },
  });
}

function data(topic: Topic, rng: Rng): Exercise {
  const n = nameOf(topic);
  if (topic.domain === "Probability" || /probab|likely|certain|chance/.test(n)) {
    return choiceExercise(topic, rng, "data", {
      prompt: "You drop a glass on stone. What is most likely?",
      speak: "If you drop a glass on stone, what is most likely?",
      explain: "A glass dropped on stone will most likely break. It is not certain, but it is likely.",
      choices: [
        { label: "It breaks", correct: true },
        { label: "It turns into a swan", correct: false },
        { label: "It is impossible to fall", correct: false },
      ],
    });
  }
  if (/sort|categor/.test(n) && !/bar|graph|pictogram|tally|chart/.test(n)) {
    return choiceExercise(topic, rng, "data", {
      prompt: "Which one belongs with the fruit?",
      speak: "Apple and banana are fruit. Which one belongs with them?",
      explain: "A pear is a fruit. A tram is not.",
      choices: [
        { label: "A pear", emoji: "🍐", correct: true },
        { label: "A tram", emoji: "🚋", correct: false },
        { label: "A key", emoji: "🔑", correct: false },
      ],
    });
  }
  if (/mean|average/.test(n)) {
    const a = irand(rng, 2, 8);
    const b = irand(rng, 2, 8);
    const c = irand(rng, 2, 8);
    const sum = a + b + c;
    const answer = Math.round(sum / 3);
    if (sum % 3 === 0) {
      return numberExercise(topic, rng, "data", {
        prompt: `What is the mean of ${a}, ${b} and ${c}?`,
        speak: `What is the mean of ${a}, ${b}, and ${c}?`,
        explain: `Add them to get ${sum}, then divide by 3. The mean is ${sum / 3}.`,
        answer: sum / 3,
        worked: { op: "/", a: sum, b: 3, answer: sum / 3 },
      });
    }
    void answer;
  }
  const swans = irand(rng, 2, 8);
  let trams = irand(rng, 2, 8);
  let apples = irand(rng, 2, 8);
  let guard = 0;
  while ((trams === swans || apples === swans || apples === trams) && guard < 12) {
    trams = irand(rng, 2, 9);
    apples = irand(rng, 2, 9);
    guard += 1;
  }
  if (trams === swans) trams = swans + 1;
  if (apples === swans || apples === trams) apples = Math.max(swans, trams) + 1;
  const bars = [
    { label: "Swans", value: swans },
    { label: "Trams", value: trams },
    { label: "Apples", value: apples },
  ];
  const top = [...bars].sort((a, b) => b.value - a.value)[0]!;
  return choiceExercise(topic, rng, "data", {
    prompt: "Which bar is tallest?",
    speak: "Which bar is tallest?",
    explain: `${top.label} is tallest, with ${top.value}.`,
    visual: { type: "bars", bars },
    choices: bars.map((bar) => ({ label: bar.label, correct: bar.label === top.label })),
  });
}

export function tryMath(topic: Topic, rng: Rng): Exercise | null {
  const n = nameOf(topic);
  const domain = topic.domain;
  const moneyish =
    domain === "Money & Finance" ||
    (topic.subject === "Life Skills" && /money|coin|price|cost|change|budget|save/.test(n));
  if (moneyish) return money(topic, rng);
  if (topic.subject !== "Mathematics") return null;
  if (domain === "Mathematical Thinking") {
    if (/pattern/.test(n)) return algebra(topic, rng);
    return null;
  }
  if (domain === "Counting & Cardinality" || /counting/.test(n)) return counting(topic, rng);
  if (domain === "Algebra" || /equation|algebra/.test(n)) return algebra(topic, rng);
  if (domain === "Ratio & Proportion") return ratio(topic, rng);
  if (domain === "Fractions") return fractions(topic, rng);
  if (domain === "Multiplication & Division") return mulDiv(topic, rng);
  if (domain === "Addition & Subtraction") return addSub(topic, rng);
  if (domain === "Number Representation & Place Value") return placeValue(topic, rng);
  if (domain === "Geometry") return geometry(topic, rng);
  if (domain === "Measurement") return measurement(topic, rng);
  if (domain === "Data & Statistics" || domain === "Probability") return data(topic, rng);
  return null;
}
