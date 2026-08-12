import { createCuratedTrophyEntry, createMemoryTrophyCandidate } from "../services/trophyCase";

export const SYNTHETIC_LIFE_VERSION = 1;
export const SYNTHETIC_LIFE_SEED = "mara-ellison-life-v1";
export const SYNTHETIC_PERSON = Object.freeze({
  id: "synthetic:mara-ellison",
  name: "Mara Ellison",
  birthYear: 1981,
  fictional: true,
});

const CATEGORIES = ["Family", "Friends", "Travel", "Fitness", "Health", "Work", "Pets", "Milestone", "Food", "Hobby", "School", "Other"];
const ORDINARY_TITLES = ["Dinner with friends", "Saturday errands", "Snow day", "Movie night", "Backyard barbecue", "Sunday walk", "School pickup story", "Local concert", "Fixed the kitchen shelf", "Coffee downtown", "Lazy afternoon", "Neighborhood festival", "Tried a new recipe", "Hike at Miller Woods", "Used car milestone", "Rainy board-game night", "Work team lunch", "Funny pet moment", "Weekend road trip", "Garden progress"];

export const SYNTHETIC_MAJOR_EVENTS = Object.freeze([
  ["1996-09-03", "First day at Northbridge High", "Started sophomore year after the family moved across town.", ["School"], 2],
  ["1999-06-12", "High school graduation", "Graduation afternoon with family in the school courtyard.", ["School", "Milestone"], 18],
  ["2000-08-24", "Moved into Lakeshore College", "Carried boxes into a small dorm room and met the floor neighbors.", ["School", "Milestone"], 8],
  ["2002-05-18", "Grandma June's memorial", "Family gathered, shared old photographs, and cooked her Sunday recipes.", ["Family"], 14],
  ["2003-05-22", "College graduation", "Finished a communications degree and celebrated downtown.", ["School", "Milestone"], 24],
  ["2003-08-11", "First agency job", "Started as a junior account coordinator at Harland Creative.", ["Work", "Milestone"], 1],
  ["2005-04-16", "Met Daniel at the spring concert", "A rainy concert night that became the start of a serious relationship.", ["Friends"], 5],
  ["2007-10-06", "Engaged at Pine Lake", "Weekend hike and a quiet proposal beside the lake.", ["Family", "Travel", "Milestone"], 16],
  ["2009-06-20", "Wedding weekend", "Friends and family filled the old brick hall for the wedding.", ["Family", "Friends", "Milestone"], 58],
  ["2010-09-14", "Bought the Cedar Street house", "Signed papers and ate takeout on the empty living-room floor.", ["Milestone", "Family"], 9],
  ["2011-11-02", "Nora was born", "First days at home with a new daughter and very little sleep.", ["Family", "Milestone"], 31],
  ["2013-03-09", "Promoted to account director", "Celebrated a demanding new role with the project team.", ["Work", "Milestone"], 4],
  ["2014-07-19", "Ellison family reunion", "Three generations met at Riverside Park for a long summer day.", ["Family"], 64],
  ["2015-10-28", "Dad's heart surgery week", "Stayed near the hospital and rotated visits with family.", ["Family", "Health"], 6],
  ["2016-08-07", "Goodbye to Pepper", "The family's old beagle died after fourteen years of muddy walks.", ["Pets", "Family"], 11],
  ["2017-02-17", "Agency position ended", "The department closed during a company restructuring.", ["Work"], 1],
  ["2017-09-30", "Moved to the Maple apartment", "Downsized after separating and set up a new room for Nora.", ["Family", "Milestone"], 12],
  ["2018-05-04", "Divorce finalized", "Signed the final paperwork and had dinner with an old friend afterward.", ["Family", "Milestone"], 1],
  ["2018-11-12", "Started at Lantern Studio", "Joined a smaller design studio after months of contract work.", ["Work", "Milestone"], 2],
  ["2019-09-15", "First half marathon", "Finished the river course with friends waiting near the last turn.", ["Fitness", "Milestone"], 25],
  ["2020-04-05", "Birthday through the window", "Family improvised a distant birthday visit during shutdown.", ["Family"], 7],
  ["2020-12-24", "Quiet Christmas Eve", "Cooked together over video calls and opened packages at home.", ["Family", "Food"], 3],
  ["2021-06-11", "Dad's memorial by the lake", "Family returned to the lake with photographs and his old fishing hat.", ["Family"], 22],
  ["2022-08-03", "Oregon coast road trip", "A winding week of beaches, rain, diners, and roadside stops.", ["Travel", "Family"], 42],
  ["2023-10-08", "Community mural unveiled", "Finished a neighborhood mural project with students and volunteers.", ["Hobby", "Work", "Milestone"], 19],
  ["2024-05-18", "Nora's middle-school concert", "A packed auditorium and a very proud post-concert dinner.", ["Family", "School"], 8],
  ["2025-07-12", "Forty-fourth birthday barbecue", "A backyard gathering with neighbors, family, and mismatched chairs.", ["Family", "Friends"], 25],
  ["2026-03-21", "Returned to the pottery studio", "Signed up for Saturday classes after years away from clay.", ["Hobby"], 6],
  ["2026-08-02", "Summer reunion at Cedar Ridge", "A long weekend reconnecting with cousins and old family stories.", ["Family", "Travel"], 37],
].map(function ([date, title, description, categories, photoCount]) {
  return Object.freeze({ date, title, description, categories, photoCount });
}));

function seedHash(text) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededRandom(seed) {
  let value = seedHash(seed);
  return function () {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function placeholderUrl(label, sequence, hue) {
  const safeLabel = String(label).replace(/[<>&]/g, "").slice(0, 14);
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='72'><path fill='hsl(" + hue + " 55% 32%)' d='M0 0h120v72H0z'/><text x='5' y='34' fill='white' font-size='8'>" + safeLabel + "</text><text x='5' y='47' fill='white' font-size='7'>" + sequence + "</text></svg>";
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function photosFor(memoryId, label, count) {
  return Array.from({ length: count }, function (_, index) {
    return {
      id: memoryId + ":photo:" + pad(index + 1),
      url: placeholderUrl(label, index + 1, (seedHash(memoryId) + index * 37) % 360),
      synthetic: true,
    };
  });
}

function ordinaryPhotoCount(random) {
  const roll = random();
  if (roll < 0.45) return 0;
  if (roll < 0.75) return 1;
  if (roll < 0.93) return 2 + Math.floor(random() * 4);
  if (roll < 0.99) return 6 + Math.floor(random() * 10);
  return 20 + Math.floor(random() * 11);
}

function generateMemories(random) {
  const majorByMonth = new Map();
  SYNTHETIC_MAJOR_EVENTS.forEach(function (event) {
    const key = event.date.slice(0, 7);
    majorByMonth.set(key, (majorByMonth.get(key) || []).concat(event));
  });
  const memories = [];
  let sequence = 0;
  for (let year = 1996; year <= 2026; year += 1) {
    const finalMonth = year === 2026 ? 8 : 12;
    for (let month = 1; month <= finalMonth; month += 1) {
      const key = year + "-" + pad(month);
      const events = majorByMonth.get(key) || [];
      const roll = random();
      let target = roll < 0.48 ? 0 : roll < 0.85 ? 1 + Math.floor(random() * 3) : roll < 0.98 ? 4 + Math.floor(random() * 3) : 10 + Math.floor(random() * 7);
      if (events.length) target = Math.max(target, 8 + Math.floor(random() * 9));
      // Deterministic sequence is intentionally advanced for each authored event.
      // eslint-disable-next-line no-loop-func
      events.forEach(function (event) {
        sequence += 1;
        const id = "synthetic:memory:" + event.date + ":" + String(sequence).padStart(4, "0");
        memories.push({ id, title: event.title, description: event.description, date: event.date, categories: event.categories.slice(), images: photosFor(id, event.title, event.photoCount), favorite: sequence % 5 === 0 });
      });
      for (let ordinal = events.length; ordinal < target; ordinal += 1) {
        sequence += 1;
        const date = key + "-" + pad(1 + Math.floor(random() * 27));
        const title = ORDINARY_TITLES[Math.floor(random() * ORDINARY_TITLES.length)];
        const id = "synthetic:memory:" + date + ":" + String(sequence).padStart(4, "0");
        const firstCategory = CATEGORIES[Math.floor(random() * CATEGORIES.length)];
        const secondCategory = random() < 0.28 ? CATEGORIES[Math.floor(random() * CATEGORIES.length)] : null;
        memories.push({
          id,
          title,
          description: title + " during " + key + ". A small moment Mara chose to keep in her timeline.",
          date,
          categories: Array.from(new Set([firstCategory, secondCategory].filter(Boolean))),
          images: photosFor(id, title, ordinaryPhotoCount(random)),
          favorite: random() < 0.08,
        });
      }
    }
  }
  return memories.sort(function (first, second) {
    return first.date.localeCompare(second.date) || first.id.localeCompare(second.id);
  });
}

const TRAINING_ERAS = [
  ["2001-09-04", "2003-04-20", 14, 55],
  ["2009-01-05", "2012-08-30", 10, 70],
  ["2018-06-02", "2019-10-10", 9, 60],
  ["2023-01-07", "2026-08-01", 8, 65],
];

function generateWorkouts() {
  const workouts = [];
  let sequence = 0;
  TRAINING_ERAS.forEach(function ([start, end, intervalDays, startingWeight], eraIndex) {
    const cursor = new Date(start + "T09:00:00Z");
    const endTime = new Date(end + "T09:00:00Z").getTime();
    let eraWorkout = 0;
    while (cursor.getTime() <= endTime) {
      sequence += 1;
      eraWorkout += 1;
      const id = "synthetic:workout:" + pad(eraIndex + 1) + ":" + String(sequence).padStart(4, "0");
      const performanceId = id + ":bench";
      const weight = startingWeight + Math.min(65, Math.floor(eraWorkout / 10) * 2.5);
      workouts.push({
        id,
        schemaVersion: 1,
        type: "strength",
        title: eraWorkout % 3 === 0 ? "Full Body Training" : "Strength Session",
        occurredAt: cursor.toISOString(),
        notes: "",
        exercises: [{
          id: performanceId,
          name: "Barbell Bench Press",
          exerciseId: "trace:chest-bb-bench-001",
          // eraWorkout is stable for this synchronous snapshot construction.
          // eslint-disable-next-line no-loop-func
          sets: [8, 7, 6].map(function (reps, setIndex) {
            return { id: performanceId + ":set:" + (setIndex + 1), reps: reps + (eraWorkout % 4 === 0 ? 1 : 0), load: { mode: "external", amount: weight, unit: "lb" }, notes: "" };
          }),
        }],
        createdAt: cursor.toISOString(),
        updatedAt: cursor.toISOString(),
      });
      cursor.setUTCDate(cursor.getUTCDate() + intervalDays);
    }
  });
  return workouts;
}

function entriesAcrossEra(prefix, start, months, entriesPerMonth, create) {
  const entries = [];
  const origin = new Date(start + "T12:00:00Z");
  let sequence = 0;
  for (let monthIndex = 0; monthIndex < months; monthIndex += 1) {
    for (let index = 0; index < entriesPerMonth; index += 1) {
      sequence += 1;
      const date = new Date(origin);
      date.setUTCMonth(origin.getUTCMonth() + monthIndex);
      date.setUTCDate(2 + index * Math.floor(25 / entriesPerMonth));
      entries.push(create(prefix + ":" + String(sequence).padStart(4, "0"), date));
    }
  }
  return entries;
}

function generateNutrition() {
  return entriesAcrossEra("synthetic:nutrition:2019", "2019-01-01", 5, 10, function (id, date) {
    return { id, loggedAt: date.toISOString(), name: "Daily food log", calories: 1900 };
  }).concat(entriesAcrossEra("synthetic:nutrition:2024", "2024-02-01", 8, 12, function (id, date) {
    return { id, loggedAt: date.toISOString(), name: "Daily food log", calories: 2050 };
  }));
}

function generateMedications() {
  return entriesAcrossEra("synthetic:medication:2015", "2015-10-01", 3, 8, function (id, date) {
    return { id, name: "Daily supplement", occurredAt: date.toISOString(), dose: { amount: 1, unit: "capsule" }, route: { code: "oral" } };
  }).concat(entriesAcrossEra("synthetic:medication:2025", "2025-01-01", 7, 10, function (id, date) {
    return { id, name: "Daily supplement", occurredAt: date.toISOString(), dose: { amount: 1, unit: "capsule" }, route: { code: "oral" } };
  }));
}

function generateTrophies(memories, workouts) {
  const majorTitles = new Set(SYNTHETIC_MAJOR_EVENTS.map(function (event) { return event.title; }));
  const selected = memories.filter(function (memory) { return majorTitles.has(memory.title); }).filter(function (_, index) { return index % 2 === 0; }).slice(0, 17);
  const memoryTrophies = selected.map(function (memory, index) {
    return createCuratedTrophyEntry(createMemoryTrophyCandidate(memory), {
      id: "synthetic:trophy:memory:" + pad(index + 1),
      addedToTrophyCaseAt: memory.date + "T18:00:00.000Z",
    });
  });
  const workoutIndexes = [20, 100, 200, 300, 400, workouts.length - 1].filter(function (index) { return workouts[index]; });
  const workoutTrophies = workoutIndexes.map(function (workoutIndex, index) {
    const workout = workouts[workoutIndex];
    const set = workout.exercises[0].sets[0];
    return {
      schemaVersion: 1,
      id: "synthetic:trophy:workout:" + pad(index + 1),
      sourceType: "workout-pr",
      sourceKey: "workout-pr|synthetic|" + workout.id + "|" + set.id,
      sourceId: workout.id,
      sourceRecordType: "heaviest-weight",
      title: "Barbell Bench Press",
      description: "Heaviest Weight Record",
      achievedAt: workout.occurredAt,
      addedToTrophyCaseAt: workout.occurredAt,
      sourceSnapshot: { workoutId: workout.id, performanceId: workout.exercises[0].id, setId: set.id, exerciseName: "Barbell Bench Press" },
      metadata: { synthetic: true },
    };
  });
  return memoryTrophies.concat(workoutTrophies);
}

export function generateSyntheticLife() {
  const start = typeof performance === "undefined" ? Date.now() : performance.now();
  const memories = generateMemories(seededRandom(SYNTHETIC_LIFE_SEED));
  const workoutEntries = generateWorkouts();
  const nutritionEntries = generateNutrition();
  const medicationEntries = generateMedications();
  const trophyCaseEntries = generateTrophies(memories, workoutEntries);
  const finish = typeof performance === "undefined" ? Date.now() : performance.now();
  return {
    schemaVersion: SYNTHETIC_LIFE_VERSION,
    seed: SYNTHETIC_LIFE_SEED,
    person: { ...SYNTHETIC_PERSON },
    memories,
    workoutEntries,
    nutritionEntries,
    medicationEntries,
    trophyCaseEntries,
    protocols: [],
    metrics: {
      generationMilliseconds: finish - start,
      memoryCount: memories.length,
      photoCount: memories.reduce(function (total, memory) { return total + memory.images.length; }, 0),
      workoutCount: workoutEntries.length,
      nutritionCount: nutritionEntries.length,
      medicationCount: medicationEntries.length,
      trophyCount: trophyCaseEntries.length,
    },
  };
}
