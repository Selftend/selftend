import {
  getTourTarget,
  setTourTarget,
  subscribeTourTargets,
} from "@/src/features/tours/tour-targets";

it("stores and clears targets", () => {
  const fake = {} as never;
  setTourTarget("home-edit", fake);
  expect(getTourTarget("home-edit")).toBe(fake);
  setTourTarget("home-edit", null);
  expect(getTourTarget("home-edit")).toBeNull();
});

it("notifies subscribers on change and stops after unsubscribe", () => {
  const listener = jest.fn();
  const unsubscribe = subscribeTourTargets(listener);
  setTourTarget("home-dates", {} as never);
  expect(listener).toHaveBeenCalledTimes(1);
  unsubscribe();
  setTourTarget("home-dates", null);
  expect(listener).toHaveBeenCalledTimes(1);
});
