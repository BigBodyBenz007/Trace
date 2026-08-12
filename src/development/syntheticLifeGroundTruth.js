import { SYNTHETIC_PERSON } from "./syntheticLife";

// Human evaluation only. No Trace derivation or UI imports this module.
export const SYNTHETIC_LIFE_GROUND_TRUTH = Object.freeze({
  person: SYNTHETIC_PERSON,
  chapters: [
    ["1996–1999", "Adolescence, a school move, widening friendships, and early independence."],
    ["2000–2003", "College life, financial constraint, family grief, graduation, and first career footing."],
    ["2004–2007", "Creative work, a serious relationship, travel, and engagement."],
    ["2008–2010", "Wedding planning, marriage, and establishing a household."],
    ["2011–2013", "New parenthood alongside rapid career responsibility."],
    ["2014–2016", "Family connection mixed with caregiving pressure and the death of a longtime pet."],
    ["2017", "Employment disruption, separation, a move, and a sharply quieter record."],
    ["2018–2019", "Divorce completion, rebuilding work and friendships, and a return to running."],
    ["2020", "Interrupted routines, distance from family, and improvised forms of connection."],
    ["2021–2022", "Parental loss, renewed family contact, and a memorable coast trip."],
    ["2023–2024", "Steady work, community art, consistent training, and parenting milestones."],
    ["2025–2026", "Ordinary pressure, sustained routines, renewed pottery, family gatherings, and open questions."],
  ],
  turningPoints: ["Grandmother's death in 2002", "Marriage in 2009", "Nora's birth in 2011", "Job loss and separation in 2017", "Divorce and career restart in 2018", "Father's death in 2021", "Community mural in 2023", "Return to pottery in 2026"],
  expectedDensePeriods: ["1999-06", "2009-06", "2011-11", "2014-07", "2019-09", "2022-08", "2025-07", "2026-08"],
  expectedQuietPeriods: ["1997 winter", "2004 spring", "2017 spring and summer", "2020 early summer", "2021 late summer"],
  narrativeArc: "Mara's life is intentionally mixed: connection and isolation, momentum and interruption, grief and ordinary humor coexist. These interpretations are evaluation ground truth only and are never supplied to Trace.",
});
