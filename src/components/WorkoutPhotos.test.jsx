import { fireEvent, render, screen } from "@testing-library/react";
import WorkoutPhotos from "./WorkoutPhotos";

test("opens and closes the selected workout photo without losing the gallery", () => {
  render(
    <WorkoutPhotos
      photos={[
        { id: "photo-1", url: "blob:first" },
        { id: "photo-2", url: "blob:second" },
      ]}
      label="Source workout photos"
    />
  );
  expect(screen.getByRole("region", { name: "Source workout photos" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View workout photo 2" }));
  expect(screen.getByAltText("Full size workout")).toHaveAttribute("src", "blob:second");
  fireEvent.click(screen.getByRole("dialog", { name: "Workout photo viewer" }));
  expect(screen.queryByRole("dialog", { name: "Workout photo viewer" })).not.toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Source workout photos" })).toBeInTheDocument();
});

test("renders nothing for a workout without photos", () => {
  const { container } = render(<WorkoutPhotos />);
  expect(container).toBeEmptyDOMElement();
});
