const starterFoods = [
  {
    id: "banana-medium",
    dedupeKey: "generic:banana-medium",
    name: "Banana",
    serving: {
      amount: 1,
      unit: "item",
      description: "1 medium banana",
      grams: 118,
    },
    nutrients: { calories: 105, protein: 1.3, carbohydrates: 27, fat: 0.4 },
    provenance: {
      source: "trace-starter",
      sourceId: "banana-medium",
      confidence: "verified",
    },
  },
  {
    id: "apple-medium",
    dedupeKey: "generic:apple-medium",
    name: "Apple",
    serving: {
      amount: 1,
      unit: "item",
      description: "1 medium apple",
      grams: 182,
    },
    nutrients: { calories: 95, protein: 0.5, carbohydrates: 25, fat: 0.3 },
    provenance: {
      source: "trace-starter",
      sourceId: "apple-medium",
      confidence: "verified",
    },
  },
  {
    id: "egg-large",
    dedupeKey: "generic:egg-large",
    name: "Egg",
    serving: {
      amount: 1,
      unit: "item",
      description: "1 large egg",
      grams: 50,
    },
    nutrients: { calories: 72, protein: 6.3, carbohydrates: 0.4, fat: 4.8 },
    provenance: {
      source: "trace-starter",
      sourceId: "egg-large",
      confidence: "verified",
    },
  },
  {
    id: "oatmeal-cooked-cup",
    name: "Oatmeal, cooked",
    serving: {
      amount: 1,
      unit: "cup",
      description: "1 cup cooked",
      grams: 234,
    },
    nutrients: { calories: 166, protein: 5.9, carbohydrates: 28.1, fat: 3.6 },
    provenance: {
      source: "trace-starter",
      sourceId: "oatmeal-cooked-cup",
      confidence: "verified",
    },
  },
  {
    id: "chicken-breast-cooked-100g",
    dedupeKey: "generic:chicken-breast-cooked",
    name: "Chicken breast, cooked",
    serving: {
      amount: 100,
      unit: "g",
      description: "100 g cooked",
      grams: 100,
    },
    nutrients: { calories: 165, protein: 31, carbohydrates: 0, fat: 3.6 },
    provenance: {
      source: "trace-starter",
      sourceId: "chicken-breast-cooked-100g",
      confidence: "verified",
    },
  },
  {
    id: "white-rice-cooked-cup",
    dedupeKey: "generic:white-rice-cooked",
    name: "White rice, cooked",
    serving: {
      amount: 1,
      unit: "cup",
      description: "1 cup cooked",
      grams: 158,
    },
    nutrients: { calories: 205, protein: 4.3, carbohydrates: 44.5, fat: 0.4 },
    provenance: {
      source: "trace-starter",
      sourceId: "white-rice-cooked-cup",
      confidence: "verified",
    },
  },
  {
    id: "greek-yogurt-plain-cup",
    dedupeKey: "generic:greek-yogurt-plain",
    name: "Greek yogurt, plain",
    serving: {
      amount: 1,
      unit: "cup",
      description: "1 cup plain",
      grams: 245,
    },
    nutrients: { calories: 149, protein: 20, carbohydrates: 8.8, fat: 4 },
    provenance: {
      source: "trace-starter",
      sourceId: "greek-yogurt-plain-cup",
      confidence: "verified",
    },
  },
  {
    id: "peanut-butter-tablespoons",
    dedupeKey: "generic:peanut-butter",
    name: "Peanut butter",
    serving: {
      amount: 2,
      unit: "tbsp",
      description: "2 tablespoons",
      grams: 32,
    },
    nutrients: { calories: 190, protein: 7, carbohydrates: 7, fat: 16 },
    provenance: {
      source: "trace-starter",
      sourceId: "peanut-butter-tablespoons",
      confidence: "verified",
    },
  },
  {
    id: "whole-milk-cup",
    dedupeKey: "generic:whole-milk",
    name: "Whole milk",
    serving: {
      amount: 1,
      unit: "cup",
      description: "1 cup",
      grams: 244,
    },
    nutrients: { calories: 149, protein: 7.7, carbohydrates: 11.7, fat: 7.9 },
    provenance: {
      source: "trace-starter",
      sourceId: "whole-milk-cup",
      confidence: "verified",
    },
  },
  {
    id: "broccoli-cooked-cup",
    dedupeKey: "generic:broccoli-cooked",
    name: "Broccoli, cooked",
    serving: {
      amount: 1,
      unit: "cup",
      description: "1 cup cooked",
      grams: 156,
    },
    nutrients: { calories: 55, protein: 3.7, carbohydrates: 11.2, fat: 0.6 },
    provenance: {
      source: "trace-starter",
      sourceId: "broccoli-cooked-cup",
      confidence: "verified",
    },
  },
];

export default starterFoods;
