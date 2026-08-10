function exercise(
  id,
  name,
  aliases,
  category,
  equipment,
  ambiguousAliases = []
) {
  return { id, name, aliases, ambiguousAliases, category, equipment };
}

export const BUILT_IN_EXERCISES = [
  exercise("trace:chest-bb-bench-001", "Barbell Bench Press", ["BB Bench Press", "Barbell Bench"], "Chest", "Barbell", ["Bench Press"]),
  exercise("trace:chest-db-bench-002", "Dumbbell Bench Press", ["DB Bench Press", "Dumbbell Bench", "DB Bench"], "Chest", "Dumbbell", ["Bench Press"]),
  exercise("trace:chest-bb-incline-003", "Incline Barbell Bench Press", ["Incline BB Bench Press", "Incline Barbell Bench"], "Chest", "Barbell", ["Incline Press"]),
  exercise("trace:chest-db-incline-004", "Incline Dumbbell Press", ["Incline DB Press", "Incline Dumbbell Bench Press", "Incline DB Bench"], "Chest", "Dumbbell", ["Incline Press"]),
  exercise("trace:chest-smith-incline-005", "Smith Machine Incline Press", ["Smith Incline Press", "Incline Smith Press"], "Chest", "Smith machine", ["Incline Press"]),
  exercise("trace:chest-machine-press-006", "Machine Chest Press", ["Chest Press Machine", "Seated Chest Press"], "Chest", "Machine", ["Chest Press"]),
  exercise("trace:chest-cable-fly-007", "Cable Chest Fly", ["Cable Fly", "Cable Flye", "Cable Crossover"], "Chest", "Cable"),
  exercise("trace:chest-pushup-008", "Push-Up", ["Pushup", "Push Up"], "Chest", "Bodyweight"),

  exercise("trace:back-bb-deadlift-009", "Barbell Deadlift", ["Conventional Deadlift", "BB Deadlift"], "Back", "Barbell", ["Deadlift"]),
  exercise("trace:back-bb-row-010", "Barbell Bent-Over Row", ["Barbell Row", "BB Row", "Bent Over Barbell Row"], "Back", "Barbell", ["Bent Over Row"]),
  exercise("trace:back-db-row-011", "One-Arm Dumbbell Row", ["Single Arm DB Row", "One Arm Dumbbell Row", "Dumbbell Row"], "Back", "Dumbbell", ["One Arm Row"]),
  exercise("trace:back-cable-row-012", "Seated Cable Row", ["Cable Seated Row", "Seated Row Cable"], "Back", "Cable", ["Seated Row"]),
  exercise("trace:back-machine-row-013", "Chest-Supported Machine Row", ["Machine Chest Supported Row", "Chest Supported Row Machine"], "Back", "Machine", ["Machine Row"]),
  exercise("trace:back-lat-pulldown-014", "Lat Pulldown", ["Cable Lat Pulldown", "Lat Pull Down"], "Back", "Cable"),
  exercise("trace:back-pullup-015", "Pull-Up", ["Pullup", "Pull Up"], "Back", "Bodyweight"),
  exercise("trace:back-chinup-016", "Chin-Up", ["Chinup", "Chin Up"], "Back", "Bodyweight"),
  exercise("trace:back-straight-arm-017", "Straight-Arm Pulldown", ["Straight Arm Cable Pulldown", "Cable Pullover"], "Back", "Cable"),

  exercise("trace:shoulders-bb-ohp-018", "Barbell Overhead Press", ["Barbell OHP", "BB Overhead Press", "Standing Barbell Press"], "Shoulders", "Barbell", ["Shoulder Press", "Overhead Press"]),
  exercise("trace:shoulders-db-press-019", "Dumbbell Shoulder Press", ["DB Shoulder Press", "Dumbbell Overhead Press", "DB OHP"], "Shoulders", "Dumbbell", ["Shoulder Press", "Overhead Press"]),
  exercise("trace:shoulders-machine-press-020", "Machine Shoulder Press", ["Shoulder Press Machine"], "Shoulders", "Machine", ["Shoulder Press", "Overhead Press"]),
  exercise("trace:shoulders-smith-press-021", "Smith Machine Shoulder Press", ["Smith Shoulder Press", "Smith OHP"], "Shoulders", "Smith machine", ["Shoulder Press", "Overhead Press"]),
  exercise("trace:shoulders-db-lateral-022", "Dumbbell Lateral Raise", ["DB Lateral Raise", "Dumbbell Side Raise"], "Shoulders", "Dumbbell", ["Lateral Raise"]),
  exercise("trace:shoulders-cable-lateral-023", "Cable Lateral Raise", ["Single Arm Cable Lateral Raise"], "Shoulders", "Cable", ["Lateral Raise"]),
  exercise("trace:shoulders-rear-delt-024", "Reverse Pec Deck", ["Rear Delt Machine Fly", "Reverse Fly Machine"], "Shoulders", "Machine", ["Rear Delt Fly"]),

  exercise("trace:biceps-bb-curl-025", "Barbell Curl", ["BB Curl", "Straight Bar Curl"], "Biceps", "Barbell", ["Curl", "Biceps Curl"]),
  exercise("trace:biceps-db-curl-026", "Dumbbell Curl", ["DB Curl", "Dumbbell Biceps Curl"], "Biceps", "Dumbbell", ["Curl", "Biceps Curl"]),
  exercise("trace:biceps-hammer-027", "Hammer Curl", ["DB Hammer Curl", "Dumbbell Hammer Curl"], "Biceps", "Dumbbell", ["Curl"]),
  exercise("trace:biceps-cable-028", "Cable Curl", ["Cable Biceps Curl"], "Biceps", "Cable", ["Curl", "Biceps Curl"]),
  exercise("trace:biceps-machine-029", "Machine Biceps Curl", ["Biceps Curl Machine", "Preacher Curl Machine"], "Biceps", "Machine", ["Curl", "Biceps Curl"]),

  exercise("trace:triceps-cable-pushdown-030", "Cable Triceps Pushdown", ["Triceps Pushdown", "Cable Pushdown", "Tricep Pushdown"], "Triceps", "Cable"),
  exercise("trace:triceps-rope-pushdown-031", "Rope Triceps Pushdown", ["Rope Pushdown", "Triceps Rope Pushdown"], "Triceps", "Cable"),
  exercise("trace:triceps-skullcrusher-032", "Barbell Skull Crusher", ["Skull Crusher", "Lying Triceps Extension"], "Triceps", "Barbell", ["Triceps Extension"]),
  exercise("trace:triceps-db-overhead-033", "Dumbbell Overhead Triceps Extension", ["DB Overhead Triceps Extension", "Dumbbell French Press"], "Triceps", "Dumbbell", ["Overhead Triceps Extension", "Triceps Extension"]),
  exercise("trace:triceps-dip-034", "Parallel Bar Dip", ["Parallel Bar Triceps Dip"], "Triceps", "Bodyweight", ["Dip", "Dips", "Bodyweight Dip", "Triceps Dip"]),
  exercise("trace:triceps-bench-dip-056", "Bench Dip", ["Bench Triceps Dip"], "Triceps", "Bodyweight", ["Dip", "Dips", "Bodyweight Dip", "Triceps Dip"]),

  exercise("trace:legs-back-squat-035", "Barbell Back Squat", ["Back Squat", "BB Back Squat"], "Legs", "Barbell", ["Squat"]),
  exercise("trace:legs-front-squat-036", "Barbell Front Squat", ["Front Squat", "BB Front Squat"], "Legs", "Barbell", ["Squat"]),
  exercise("trace:legs-goblet-squat-037", "Goblet Squat", ["Dumbbell Goblet Squat", "DB Goblet Squat"], "Legs", "Dumbbell", ["Squat"]),
  exercise("trace:legs-smith-squat-038", "Smith Machine Squat", ["Smith Squat"], "Legs", "Smith machine", ["Squat"]),
  exercise("trace:legs-bodyweight-squat-039", "Bodyweight Squat", ["Air Squat"], "Legs", "Bodyweight", ["Squat"]),
  exercise("trace:legs-leg-press-040", "Leg Press", ["Machine Leg Press"], "Legs", "Machine"),
  exercise("trace:legs-leg-extension-041", "Leg Extension", ["Machine Leg Extension", "Leg Extension Machine"], "Legs", "Machine"),
  exercise("trace:legs-leg-curl-042", "Seated Leg Curl", ["Seated Hamstring Curl", "Seated Leg Curl Machine"], "Legs", "Machine", ["Leg Curl"]),

  exercise("trace:glutes-bb-hip-thrust-043", "Barbell Hip Thrust", ["BB Hip Thrust"], "Glutes", "Barbell", ["Hip Thrust"]),
  exercise("trace:glutes-machine-hip-thrust-044", "Machine Hip Thrust", ["Hip Thrust Machine"], "Glutes", "Machine", ["Hip Thrust"]),
  exercise("trace:glutes-db-rdl-045", "Dumbbell Romanian Deadlift", ["DB RDL", "Dumbbell RDL"], "Glutes", "Dumbbell", ["Romanian Deadlift", "RDL"]),
  exercise("trace:glutes-cable-kickback-046", "Cable Glute Kickback", ["Glute Cable Kickback", "Cable Kickback"], "Glutes", "Cable"),

  exercise("trace:calves-standing-machine-047", "Standing Calf Raise Machine", ["Machine Standing Calf Raise"], "Calves", "Machine", ["Standing Calf Raise"]),
  exercise("trace:calves-seated-machine-048", "Seated Calf Raise", ["Seated Calf Raise Machine"], "Calves", "Machine"),
  exercise("trace:calves-bodyweight-049", "Bodyweight Calf Raise", ["Standing Bodyweight Calf Raise"], "Calves", "Bodyweight", ["Standing Calf Raise"]),

  exercise("trace:core-crunch-050", "Crunch", ["Abdominal Crunch", "Ab Crunch"], "Core", "Bodyweight"),
  exercise("trace:core-cable-crunch-051", "Cable Crunch", ["Kneeling Cable Crunch", "Cable Ab Crunch"], "Core", "Cable", ["Crunch"]),
  exercise("trace:core-plank-052", "Front Plank", ["Plank", "Forearm Plank"], "Core", "Bodyweight"),
  exercise("trace:core-hanging-raise-053", "Hanging Leg Raise", ["Hanging Straight Leg Raise"], "Core", "Bodyweight", ["Leg Raise"]),
  exercise("trace:core-machine-crunch-054", "Machine Ab Crunch", ["Ab Crunch Machine", "Machine Crunch"], "Core", "Machine", ["Crunch"]),
  exercise("trace:core-pallof-055", "Pallof Press", ["Cable Pallof Press", "Anti Rotation Press"], "Core", "Cable"),
];

export default BUILT_IN_EXERCISES;
