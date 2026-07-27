import { vars } from "nativewind";

import { roomVariables } from "@/src/lib/module-room";

import { expectRoomPour, expectedRoomVariables, pouredVariables } from "./room-pour";

// The guard on the guard (#389). Every room suite now leans on
// expectRoomPour, so these tests pin the two properties that make that
// assertion worth anything: it reads real variable values back out of
// nativewind's opaque style, and it FAILS on the wrong hue. If a nativewind
// upgrade moves the internals, this file goes red - the room suites do not
// silently return to passing on any hue.

const ROOM_HUES = ["be", "ink", "think", "act", "aqua", "clay", "iris"] as const;

describe("pouredVariables", () => {
  it("recovers the real variable values nativewind hides in an opaque style", () => {
    // The exact failure #389 was about: the style itself looks empty...
    const iris = roomVariables("iris").light;
    expect(Object.keys(iris)).toEqual([]);
    expect(JSON.stringify(iris)).toBe("{}");

    // ...but its variables are there, and they carry iris's 280 degree.
    expect(pouredVariables(iris)["--background"]).toBe("280 32% 95%");
    expect(Object.keys(pouredVariables(iris)).length).toBeGreaterThan(1);
  });

  it("agrees with the room recipe for every hue in both schemes", () => {
    for (const hue of ROOM_HUES) {
      expect(pouredVariables(roomVariables(hue).light)).toEqual(
        expectedRoomVariables(hue, "light"),
      );
      expect(pouredVariables(roomVariables(hue).dark)).toEqual(expectedRoomVariables(hue, "dark"));
    }
  });

  it("throws rather than reporting an empty map when handed a non-pour", () => {
    // A silent `{}` here is exactly how the old assertion went vacuous.
    expect(() => pouredVariables({})).toThrow(/not a room pour/);
    expect(() => pouredVariables(undefined)).toThrow(/Expected a room-pour style/);
    expect(() => pouredVariables([roomVariables("iris").light])).toThrow(/got an array/);
    expect(() => pouredVariables(vars({}))).toThrow(/no variables in it/);
  });
});

describe("expectRoomPour", () => {
  it("passes on the right hue and FAILS on every other one", () => {
    // The mutation test, made permanent: if this ever stops throwing, the
    // room suites have gone vacuous again.
    for (const hue of ROOM_HUES) {
      const element = { props: { style: roomVariables(hue).light } };
      expect(() => expectRoomPour(element, hue)).not.toThrow();

      for (const other of ROOM_HUES.filter((h) => h !== hue)) {
        expect(() => expectRoomPour(element, other)).toThrow();
      }
    }
  });

  it("tells the schemes apart within one hue", () => {
    const light = { props: { style: roomVariables("ink").light } };
    expect(() => expectRoomPour(light, "ink", "light")).not.toThrow();
    expect(() => expectRoomPour(light, "ink", "dark")).toThrow();
  });
});
