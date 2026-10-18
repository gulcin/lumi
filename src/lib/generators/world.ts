import type { Rng } from "../rng";
import type { Topic } from "../types";
import type { Exercise } from "./types";
import { choiceExercise, pick } from "./util";

type BankQ = {
  q: string;
  choices: string[];
  answer: number;
  domains: string[];
  keywords?: string[];
  minAge: number;
  maxAge?: number;
  explain: string;
};

const BANK: BankQ[] = [
  { q: "Which of these is a living thing?", choices: ["A cat", "A rock", "A spoon"], answer: 0, domains: ["Organisms & Life Processes"], keywords: ["living"], minAge: 5, maxAge: 8, explain: "A cat grows, needs food, and can have babies. A rock does not." },
  { q: "What do plants need to grow?", choices: ["Water and light", "Only darkness", "Only plastic"], answer: 0, domains: ["Organisms & Life Processes"], keywords: ["plant", "need", "grow"], minAge: 5, maxAge: 9, explain: "Plants need water and light. Most also need air and nutrients from soil." },
  { q: "Which animal eats only plants?", choices: ["A herbivore", "A carnivore", "A rock"], answer: 0, domains: ["Organisms & Life Processes"], keywords: ["herbivore", "carnivore", "omnivore"], minAge: 6, explain: "Herbivores eat plants. Carnivores eat other animals." },
  { q: "Which part of a plant takes in water?", choices: ["The roots", "The flower petals only", "The shadow"], answer: 0, domains: ["Organisms & Life Processes"], keywords: ["root", "part", "plant"], minAge: 6, maxAge: 10, explain: "Roots take in water from the soil." },
  { q: "Photosynthesis is how plants…", choices: ["Make food using light", "Breathe fire", "Turn into animals"], answer: 0, domains: ["Organisms & Life Processes"], keywords: ["photosynthesis", "food"], minAge: 9, explain: "Plants use light, water, and air to make food. That process is photosynthesis." },
  { q: "Which sense do you use to hear a tram?", choices: ["Hearing", "Taste", "Smell"], answer: 0, domains: ["The Human Body", "Organisms & Life Processes"], keywords: ["sense", "hear", "body"], minAge: 5, maxAge: 8, explain: "Ears are for hearing." },
  { q: "What does your heart do?", choices: ["Pumps blood", "Digests sandwiches", "Grows leaves"], answer: 0, domains: ["The Human Body"], keywords: ["heart", "blood"], minAge: 6, explain: "The heart pumps blood around the body." },
  { q: "Which group helps your body move?", choices: ["Bones and muscles", "Only hair", "Only freckles"], answer: 0, domains: ["The Human Body"], keywords: ["bone", "muscle"], minAge: 7, explain: "Muscles pull on bones so you can move." },
  { q: "Which meal has foods from more than one group?", choices: ["Bread, cheese, and an apple", "Only sugar cubes", "Only salt"], answer: 0, domains: ["The Human Body"], keywords: ["diet", "food"], minAge: 7, explain: "A mix of foods gives the body more of what it needs." },
  { q: "Lungs are mainly for…", choices: ["Breathing", "Hearing", "Tasting"], answer: 0, domains: ["The Human Body"], keywords: ["lung", "breath"], minAge: 8, explain: "Lungs take in air so the body can get oxygen." },
  { q: "Which material is attracted to a magnet?", choices: ["A steel paperclip", "A wooden spoon", "A plastic cup"], answer: 0, domains: ["Forces & Motion", "Matter & Materials"], keywords: ["magnet"], minAge: 6, explain: "Steel is a magnetic metal. Wood and plastic are not." },
  { q: "A push and a pull are both…", choices: ["Forces", "Colours", "Planets"], answer: 0, domains: ["Forces & Motion"], keywords: ["push", "pull", "force"], minAge: 5, maxAge: 9, explain: "Pushes and pulls are forces. They can start or stop movement." },
  { q: "Friction is greatest when surfaces are…", choices: ["Rough", "Perfectly smooth and icy", "Invisible"], answer: 0, domains: ["Forces & Motion"], keywords: ["friction"], minAge: 8, explain: "Rough surfaces grip more, so there is more friction." },
  { q: "On Earth, dropped things fall because of…", choices: ["Gravity", "Music", "Shadows"], answer: 0, domains: ["Forces & Motion"], keywords: ["gravity", "fall"], minAge: 8, explain: "Gravity pulls objects toward the Earth." },
  { q: "Which is a solid?", choices: ["An ice cube", "Steam", "Orange juice"], answer: 0, domains: ["Matter & Materials"], keywords: ["solid", "state", "ice"], minAge: 6, explain: "Ice keeps its shape. Juice is a liquid. Steam is a gas." },
  { q: "Which material is waterproof?", choices: ["Plastic", "Tissue paper", "A sponge"], answer: 0, domains: ["Matter & Materials"], keywords: ["material", "waterproof", "property"], minAge: 5, maxAge: 9, explain: "Plastic can keep water out. Tissue paper and a sponge soak it up." },
  { q: "Melting changes a solid into a…", choices: ["Liquid", "Sound", "Shadow"], answer: 0, domains: ["Matter & Materials"], keywords: ["melt", "change"], minAge: 7, explain: "When ice melts it becomes liquid water." },
  { q: "Evaporation is when a liquid…", choices: ["Turns into a gas", "Becomes a fossil", "Grows legs"], answer: 0, domains: ["Matter & Materials", "Earth's Systems"], keywords: ["evaporat"], minAge: 8, explain: "Evaporation sends tiny bits of liquid into the air as gas." },
  { q: "We see the Moon because it…", choices: ["Reflects sunlight", "Is a campfire", "Is a fish"], answer: 0, domains: ["Space Exploration", "Space Systems & Earth's History"], keywords: ["moon"], minAge: 7, explain: "The Moon does not make its own light. It reflects light from the Sun." },
  { q: "The Sun is a…", choices: ["Star", "Planet", "Moon"], answer: 0, domains: ["Space Exploration", "Space Systems & Earth's History"], keywords: ["sun", "star"], minAge: 6, explain: "The Sun is a star. Earth is a planet that travels around it." },
  { q: "How long does Earth take to orbit the Sun?", choices: ["About one year", "About one minute", "About one day"], answer: 0, domains: ["Space Systems & Earth's History", "Space Exploration"], keywords: ["orbit", "year", "season"], minAge: 8, explain: "One trip around the Sun takes about one year. One spin of Earth is about one day." },
  { q: "Which planet is known for its rings?", choices: ["Saturn", "The Moon", "A comet"], answer: 0, domains: ["Space Exploration", "Space Systems & Earth's History"], keywords: ["planet", "saturn", "ring"], minAge: 7, explain: "Saturn's rings are made of ice and rock." },
  { q: "An astronaut travels…", choices: ["Into space", "Only under the sea", "Inside a volcano"], answer: 0, domains: ["Space Exploration"], keywords: ["astronaut"], minAge: 5, maxAge: 9, explain: "Astronauts train to travel and work in space." },
  { q: "Which animal is a minibeast?", choices: ["A ladybird", "A whale", "A horse"], answer: 0, domains: ["Insects & Minibeasts"], keywords: ["minibeast", "insect", "ladybird"], minAge: 5, maxAge: 9, explain: "Minibeasts are small animals such as insects and spiders." },
  { q: "A caterpillar can become a…", choices: ["Butterfly", "Fish", "Cloud"], answer: 0, domains: ["Insects & Minibeasts"], keywords: ["caterpillar", "butterfly", "life cycle"], minAge: 5, maxAge: 9, explain: "A caterpillar changes into a butterfly. That change is metamorphosis." },
  { q: "Bees help plants by…", choices: ["Moving pollen", "Eating the roots only", "Making thunder"], answer: 0, domains: ["Insects & Minibeasts", "Organisms & Life Processes"], keywords: ["bee", "pollen"], minAge: 6, explain: "Bees carry pollen from flower to flower, which helps plants make seeds." },
  { q: "A penguin is a…", choices: ["Bird", "Fish", "Insect"], answer: 0, domains: ["Polar Regions", "Animals of the World"], keywords: ["penguin"], minAge: 5, explain: "Penguins are birds. They have feathers and lay eggs, even though they swim." },
  { q: "Polar bears live in the…", choices: ["Arctic", "Antarctic", "Rainforest"], answer: 0, domains: ["Polar Regions"], keywords: ["polar bear", "arctic"], minAge: 6, explain: "Polar bears live in the Arctic. Penguins live in the Antarctic, not with polar bears." },
  { q: "Which place is cold and icy for much of the year?", choices: ["The poles", "A tropical rainforest", "A hot desert"], answer: 0, domains: ["Polar Regions"], keywords: ["ice", "pole", "arctic", "antarctic"], minAge: 5, maxAge: 9, explain: "The Arctic and Antarctic are the polar regions. They are very cold." },
  { q: "A rainforest is usually…", choices: ["Warm and wet", "Frozen all year", "Under the sea"], answer: 0, domains: ["Rainforests"], keywords: ["rainforest"], minAge: 5, maxAge: 10, explain: "Rainforests get a lot of rain and stay warm." },
  { q: "Which food first grew in rainforest regions?", choices: ["Cocoa", "Ice cubes", "Snow"], answer: 0, domains: ["Rainforests"], keywords: ["food", "cocoa", "banana"], minAge: 6, maxAge: 10, explain: "Cocoa, which we use for chocolate, comes from rainforest cacao trees." },
  { q: "The ocean is…", choices: ["Salty water", "Made of sand only", "A kind of cloud"], answer: 0, domains: ["Ocean Life"], keywords: ["ocean", "sea"], minAge: 5, maxAge: 8, explain: "Oceans are huge bodies of salty water." },
  { q: "A whale is a…", choices: ["Mammal", "Fish", "Insect"], answer: 0, domains: ["Ocean Life", "Animals of the World"], keywords: ["whale", "dolphin", "mammal"], minAge: 6, explain: "Whales and dolphins are mammals. They breathe air and feed milk to their babies." },
  { q: "Which place might you find in a rock pool?", choices: ["A crab", "A polar bear", "A camel"], answer: 0, domains: ["Ocean Life"], keywords: ["rock pool", "coast", "crab"], minAge: 5, maxAge: 9, explain: "Crabs, anemones, and shells often live in rock pools." },
  { q: "Dinosaurs lived…", choices: ["Long before people", "In the same houses as us", "Only in storybooks, never for real"], answer: 0, domains: ["Dinosaurs & Paleontology"], keywords: ["dinosaur"], minAge: 5, maxAge: 9, explain: "Dinosaurs were real animals. They died out long before people lived." },
  { q: "Fossils are…", choices: ["Preserved remains or traces of living things", "New plastic toys", "Clouds"], answer: 0, domains: ["Dinosaurs & Paleontology"], keywords: ["fossil"], minAge: 6, explain: "Fossils form when remains or traces are preserved in rock." },
  { q: "An animal that eats meat is a…", choices: ["Carnivore", "Herbivore", "Plant"], answer: 0, domains: ["Dinosaurs & Paleontology", "Organisms & Life Processes"], keywords: ["meat", "carnivore"], minAge: 6, explain: "Carnivores eat other animals. Herbivores eat plants." },
  { q: "Camouflage helps an animal…", choices: ["Hide", "Grow wheels", "Breathe underwater if it is a bird"], answer: 0, domains: ["Animals of the World"], keywords: ["camouflage", "hide"], minAge: 6, explain: "Camouflage is colour or pattern that makes an animal harder to see." },
  { q: "A nocturnal animal is mostly active…", choices: ["At night", "Only in winter", "Only underground in cities"], answer: 0, domains: ["Animals of the World"], keywords: ["nocturnal"], minAge: 6, explain: "Nocturnal animals, such as owls, are awake at night." },
  { q: "Which one is weather?", choices: ["Rain", "A chair", "A book"], answer: 0, domains: ["Weather & Climate"], keywords: ["weather", "rain"], minAge: 5, maxAge: 8, explain: "Rain, wind, sun, and snow are kinds of weather." },
  { q: "In a thunderstorm you should…", choices: ["Go indoors", "Stand under the only tree", "Fly a kite"], answer: 0, domains: ["Weather & Climate"], keywords: ["storm", "safety"], minAge: 5, maxAge: 9, explain: "Indoors is safer in a storm. Stay away from open high places." },
  { q: "A thermometer measures…", choices: ["Temperature", "Sound", "How many swans"], answer: 0, domains: ["Weather & Climate"], keywords: ["temperature", "thermometer"], minAge: 6, explain: "Thermometers measure how hot or cold something is." },
  { q: "Climate means…", choices: ["The usual weather over many years", "Today's puddle only", "A kind of rock"], answer: 0, domains: ["Weather & Climate"], keywords: ["climate"], minAge: 8, explain: "Weather is what happens today. Climate is the pattern over a long time." },
  { q: "A volcano can…", choices: ["Erupt melted rock", "Lay eggs", "Orbit the Moon"], answer: 0, domains: ["Volcanoes & Earthquakes"], keywords: ["volcano"], minAge: 6, explain: "Melted rock under the Earth is magma. When it comes out, it is lava." },
  { q: "An earthquake is…", choices: ["The ground shaking", "A kind of fish", "A full moon"], answer: 0, domains: ["Volcanoes & Earthquakes"], keywords: ["earthquake"], minAge: 6, explain: "Earthquakes happen when the Earth's crust moves suddenly." },
  { q: "During an earthquake indoors, a safer action is to…", choices: ["Drop, cover, and hold on", "Run to the window", "Hide in a lift"], answer: 0, domains: ["Volcanoes & Earthquakes"], keywords: ["safety", "earthquake"], minAge: 7, explain: "Drop, cover, and hold on protects you from falling things." },
  { q: "A habitat is…", choices: ["The place a living thing makes its home", "A type of shoe", "A musical note"], answer: 0, domains: ["Ecosystems & Habitats"], keywords: ["habitat"], minAge: 6, explain: "A habitat provides what a living thing needs, such as food and shelter." },
  { q: "In a food chain, a plant is usually a…", choices: ["Producer", "Tractor", "Fossil"], answer: 0, domains: ["Ecosystems & Habitats"], keywords: ["food chain", "producer"], minAge: 7, explain: "Plants produce their own food, so they are called producers." },
  { q: "Which change helps a local habitat?", choices: ["Leaving wild flowers for insects", "Pouring paint in a pond", "Breaking every nest"], answer: 0, domains: ["Ecosystems & Habitats"], keywords: ["impact", "protect", "habitat"], minAge: 7, explain: "Wild flowers feed insects. Harming a pond does the opposite." },
  { q: "A shadow forms when…", choices: ["An object blocks light", "Sound is loud", "Water freezes"], answer: 0, domains: ["Waves, Light & Sound"], keywords: ["shadow", "light"], minAge: 6, explain: "Light travels in straight lines. A solid object can block it and leave a shadow." },
  { q: "Sound is made by…", choices: ["Vibrations", "Silence", "Only magnets"], answer: 0, domains: ["Waves, Light & Sound"], keywords: ["sound", "vibrat"], minAge: 6, explain: "Vibrations shake the air, and our ears hear that as sound." },
  { q: "A transparent material…", choices: ["Lets most light through", "Blocks all light", "Makes sound disappear"], answer: 0, domains: ["Waves, Light & Sound", "Matter & Materials"], keywords: ["transparent", "translucent", "opaque"], minAge: 7, explain: "You can see clearly through transparent materials, like clean glass." },
  { q: "Sunlight can…", choices: ["Warm things up", "Freeze a pond by itself", "Turn off gravity"], answer: 0, domains: ["Energy"], keywords: ["sun", "warm", "energy"], minAge: 5, maxAge: 9, explain: "Sunlight carries energy that warms the ground, water, and you." },
  { q: "Which is a form of energy?", choices: ["Light", "A surname", "A Tuesday"], answer: 0, domains: ["Energy"], keywords: ["energy"], minAge: 8, explain: "Light, heat, sound, and movement are forms of energy." },
  { q: "A fair test changes…", choices: ["Only one thing at a time", "Every thing at once", "Nothing, ever"], answer: 0, domains: ["Scientific Inquiry"], keywords: ["test", "fair", "experiment"], minAge: 7, explain: "If you change only one thing, you can tell what caused the result." },
  { q: "Observing means…", choices: ["Looking carefully and noticing", "Guessing with your eyes shut", "Copying a story"], answer: 0, domains: ["Scientific Inquiry"], keywords: ["observ"], minAge: 5, maxAge: 9, explain: "Scientists observe with their senses and with tools, then record what they notice." },
  { q: "Which question could science test?", choices: ["Which cup keeps water warm longer?", "Which colour is the prettiest?", "Which story is the funniest?"], answer: 0, domains: ["Scientific Inquiry"], keywords: ["question"], minAge: 7, explain: "You can measure temperature. Prettiest and funniest are opinions." },
  { q: "The great pyramids were built in…", choices: ["Ancient Egypt", "The Arctic Ocean", "Last Tuesday"], answer: 0, domains: ["Ancient Egypt"], keywords: ["pyramid", "egypt"], minAge: 6, explain: "The famous stone pyramids were tombs built in ancient Egypt." },
  { q: "The river that runs through Egypt is the…", choices: ["Nile", "Vltava", "Amazon"], answer: 0, domains: ["Ancient Egypt"], keywords: ["nile", "river"], minAge: 7, explain: "The Nile gave ancient Egypt water for farms and travel." },
  { q: "A pharaoh was…", choices: ["A ruler of ancient Egypt", "A kind of tram", "A polar animal"], answer: 0, domains: ["Ancient Egypt"], keywords: ["pharaoh", "ruler"], minAge: 7, explain: "Pharaohs were the kings and queens of ancient Egypt." },
  { q: "Hieroglyphs were…", choices: ["A way of writing with pictures and symbols", "A type of volcano", "A musical instrument"], answer: 0, domains: ["Ancient Egypt"], keywords: ["hieroglyph", "writing"], minAge: 7, explain: "Ancient Egyptians wrote with hieroglyphs." },
  { q: "The Olympic Games began in…", choices: ["Ancient Greece", "A space station", "A rainforest canopy"], answer: 0, domains: ["Ancient Greece & Rome"], keywords: ["olympic", "greece"], minAge: 7, explain: "The ancient Olympics were held at Olympia in Greece." },
  { q: "Athens is a city famous in…", choices: ["Ancient Greece", "The story of dinosaurs", "The centre of the Sun"], answer: 0, domains: ["Ancient Greece & Rome"], keywords: ["athens", "greece"], minAge: 7, explain: "Athens was a powerful city in ancient Greece." },
  { q: "The Colosseum is in…", choices: ["Rome", "The Moon", "Antarctica"], answer: 0, domains: ["Ancient Greece & Rome"], keywords: ["rome", "colosseum"], minAge: 7, explain: "The Colosseum is a huge ancient amphitheatre in Rome." },
  { q: "People in ancient Rome spoke…", choices: ["Latin", "Only bird calls", "Binary"], answer: 0, domains: ["Ancient Greece & Rome"], keywords: ["latin", "rome"], minAge: 8, explain: "Latin was the language of ancient Rome. Many English words grew from it." },
  { q: "A medieval castle was mainly…", choices: ["A strong home for a lord", "A spaceship", "A kind of fish"], answer: 0, domains: ["Medieval Times"], keywords: ["castle"], minAge: 6, explain: "Castles were built to house a lord and to be hard to attack." },
  { q: "A knight in medieval times trained to…", choices: ["Fight for a lord", "Drive a tram", "Orbit Saturn"], answer: 0, domains: ["Medieval Times"], keywords: ["knight"], minAge: 6, maxAge: 11, explain: "Knights were trained fighters who served a lord or king." },
  { q: "A source from the past, such as a letter, helps historians…", choices: ["Find evidence about what happened", "Change yesterday", "Stop gravity"], answer: 0, domains: ["Historical Thinking"], keywords: ["source", "evidence", "historian"], minAge: 8, explain: "Historians use sources as evidence. They ask who made them and why." },
  { q: "Which of these uses a kind of pattern-finding technology?", choices: ["A phone that suggests the next word", "A wooden spoon", "A pebble"], answer: 0, domains: ["Artificial Intelligence"], keywords: ["ai", "daily", "phone"], minAge: 6, maxAge: 10, explain: "Word suggestions look for patterns in language. That is a simple kind of AI." },
  { q: "A computer follows…", choices: ["Instructions", "Only dreams", "The weather by magic"], answer: 0, domains: ["Artificial Intelligence"], keywords: ["computer", "instruction", "program"], minAge: 7, explain: "Programs are instructions. A computer does what those instructions say." },
];

function hasWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function scoreQuestion(topic: Topic, question: BankQ): number {
  if (!question.domains.includes(topic.domain)) return -1;
  if (topic.ageRangeEnd < question.minAge) return -1;
  if (question.maxAge != null && topic.ageRangeStart > question.maxAge) return -1;
  const name = `${topic.name} ${topic.description}`;
  let score = 3;
  const keys = question.keywords ?? [];
  if (keys.some((key) => hasWord(name, key))) score += 6;
  return score;
}

export function tryWorld(topic: Topic, rng: Rng): Exercise | null {
  if (topic.subject !== "Science" && topic.subject !== "History" && topic.subject !== "Computing") return null;
  const ranked = BANK.map((question) => ({ question, score: scoreQuestion(topic, question) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score);
  if (!ranked.length) return null;
  const best = ranked[0]!.score;
  const keywordNeeded = topic.ageRangeStart >= 11;
  const good = ranked.filter((row) => row.score >= best - 1 && row.score >= (keywordNeeded ? 6 : 3));
  if (!good.length) return null;
  const choice = pick(rng, good.slice(0, Math.min(4, good.length))).question;
  return choiceExercise(topic, rng, "world", {
    prompt: choice.q,
    speak: choice.q,
    explain: choice.explain,
    choices: choice.choices.map((label, index) => ({ label, correct: index === choice.answer })),
  });
}
