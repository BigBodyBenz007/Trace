export function workoutDurationMilliseconds(startedAt, finishedAt) {
  if (
    typeof startedAt !== "string" ||
    !startedAt.trim() ||
    typeof finishedAt !== "string" ||
    !finishedAt.trim()
  ) {
    return null;
  }
  const start = new Date(startedAt).getTime();
  const finish = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) {
    return null;
  }
  return finish - start;
}

export function formatWorkoutDuration(startedAt, finishedAt) {
  const duration = workoutDurationMilliseconds(startedAt, finishedAt);
  if (duration === null) return null;

  const totalMinutes = Math.floor(duration / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${totalMinutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
}

export function elapsedWorkoutMinutes(startedAt, finishedAt = new Date()) {
  const finish = finishedAt instanceof Date
    ? finishedAt.getTime()
    : new Date(finishedAt).getTime();
  const start = new Date(startedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(finish) || finish < start) {
    return null;
  }
  return Math.max(1, Math.round((finish - start) / 60000));
}

export function isValidWorkoutDurationMinutes(value) {
  return typeof value === "number"
    && Number.isFinite(value)
    && value > 0;
}

export function resolveWorkoutCalorieDuration(workout) {
  if (isValidWorkoutDurationMinutes(workout?.activeDurationMinutes)) {
    return {
      minutes: workout.activeDurationMinutes,
      source: "entered",
    };
  }

  const recordedMinutes = elapsedWorkoutMinutes(
    workout?.startedAt,
    workout?.finishedAt
  );
  if (isValidWorkoutDurationMinutes(recordedMinutes)) {
    return {
      minutes: recordedMinutes,
      source: "recorded",
    };
  }

  return { minutes: null, source: null };
}
