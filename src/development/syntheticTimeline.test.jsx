import { render, screen } from "@testing-library/react";
import HomePage from "../components/HomePage";
import { generateSyntheticLife } from "./syntheticLife";

test("the real Timeline can render the complete synthetic biography with bounded galleries", () => {
  const dataset = generateSyntheticLife();
  const started = performance.now();
  const { container } = render(
    <HomePage
      memoryCount={dataset.memories.length}
      memories={dataset.memories}
      nutritionEntries={dataset.nutritionEntries}
      workoutEntries={dataset.workoutEntries}
      medicationEntries={dataset.medicationEntries}
      trophyEntries={dataset.trophyCaseEntries}
      toggleFavorite={() => false}
      onAddMemory={() => false}
      onOpenNutrition={() => false}
      onOpenMedications={() => false}
      onOpenProtocols={() => false}
      onOpenWorkouts={() => false}
      onOpenTrophyCase={() => false}
      deleteMemory={() => false}
      editMemory={() => false}
      addTrophyCaseEntry={() => false}
      buttonStyle={{}}
      inputStyle={{}}
      containerStyle={{}}
    />
  );
  const elapsed = performance.now() - started;
  expect(container.querySelectorAll('[data-testid^="timeline-memory-"]'))
    .toHaveLength(dataset.memories.length);
  expect(container.querySelectorAll("[data-timeline-gallery-thumbnail]").length)
    .toBeLessThanOrEqual(dataset.memories.length * 3);
  expect(screen.getByTestId("life-current")).toBeInTheDocument();
  expect(Number.isFinite(elapsed)).toBe(true);

});
