import { render } from "@testing-library/react";
import useBackgroundScrollLock from "./useBackgroundScrollLock";

function Lock({ active = true }) { useBackgroundScrollLock(active); return null; }

test("locks, nests safely, restores scroll, and cleans up on final unmount", () => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 320 });
  window.scrollTo = jest.fn();
  const first = render(<Lock />);
  expect(document.body.style.position).toBe("fixed");
  expect(document.body.style.top).toBe("-320px");
  const second = render(<Lock />);
  first.unmount();
  expect(document.body.style.position).toBe("fixed");
  expect(window.scrollTo).not.toHaveBeenCalled();
  second.unmount();
  expect(document.body.style.position).toBe("");
  expect(window.scrollTo).toHaveBeenCalledWith({ left: 0, top: 320, behavior: "auto" });
});
