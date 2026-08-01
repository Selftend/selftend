import { vars } from "nativewind";

import { roomVariables } from "@/src/lib/module-room";

import {
  carriesNoPour,
  expectNeutralRoom,
  expectedRoomVariables,
  pouredVariables,
} from "./room-pour";

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

describe("expectNeutralRoom", () => {
  // The mutation test, made permanent, now pointing the other way: it must FAIL
  // on a real pour. A neutral-room assertion that passed on a poured style would
  // let a room come back without turning anything red — which is the same vacuum
  // #389 found, inverted.
  it("passes on no pour and FAILS on every hue's pour", () => {
    expect(() => expectNeutralRoom({ props: { style: vars({}) } })).not.toThrow();
    expect(() => expectNeutralRoom({ props: { style: {} } })).not.toThrow();

    for (const hue of ROOM_HUES) {
      const poured = { props: { style: roomVariables(hue).light } };
      expect(() => expectNeutralRoom(poured)).toThrow();
    }
  });

  it("carriesNoPour agrees with it, in both directions", () => {
    expect(carriesNoPour(vars({}))).toBe(true);
    expect(carriesNoPour(roomVariables("iris").light)).toBe(false);
    // Not a style at all: false rather than a throw, so a caller cannot read
    // "no pour" out of a mistake.
    expect(carriesNoPour(undefined)).toBe(false);
    expect(carriesNoPour([vars({})])).toBe(false);
  });
});
