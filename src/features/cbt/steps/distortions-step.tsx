import { useEffect, useRef, useState } from "react";
import { Controller, type Control, type FieldErrors } from "react-hook-form";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { CheckboxRow } from "@/src/components/app/checkbox-row";
import { ChipRun, StaticChip } from "@/src/components/app/selectable-chip";
import { Disclosure } from "@/src/components/app/disclosure";
import { Label } from "@/src/components/react-native-reusables/label";
import { Text } from "@/src/components/react-native-reusables/text";
import { distortionDefinitions } from "@/src/constants/distortions";
import type { ThoughtRecordFormSchema } from "@/src/features/cbt/schemas";
import { focusNode } from "@/src/lib/accessibility";
import { scrollNodeToTop } from "@/src/lib/scroll-node-to-top";

interface DistortionsStepProps {
  control: Control<ThoughtRecordFormSchema>;
  errors: FieldErrors<ThoughtRecordFormSchema>;
}

interface PatternsBlockProps {
  chosenKeys: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

/**
 * The seventeen patterns as rows, not cards (#2349), that fold to what was
 * chosen once anything is (#2350).
 *
 * The block sits where it has always sat, before Evidence (#1224). Open, every
 * option is on screen and the per-card chrome is gone - a third of the block's
 * height, and something no other checkbox list in the app wears. Ticked, the
 * other sixteen fold away and the distance from the tick to the Evidence field
 * goes from 2,251px to 169px, measured at 360px on #2333.
 *
 * ☠️ **The durable half of that ruling is a GATE, not this shape:** an answer may
 * never leave the screen; unchosen options may, but only once the person has
 * answered. Both halves are structural here rather than remembered -
 *
 * - nothing can fold before a first tick, because the disclosure is not rendered
 *   at all while the field is empty. There is no control to press, so there is
 *   no state in which a person who has answered nothing is looking at a summary.
 * - the chosen names never leave: folded, they are the summary.
 *
 * ☠️ **Folded is derived from the FIELD, not latched at mount.** Arriving on a
 * restored draft or on an edit folds the block, and the edit path is why it
 * cannot be a `useState` initialiser: the record is fetched, then `reset` lands
 * the values in an effect AFTER this block's first render, so a snapshot taken
 * at mount reads an empty field and leaves the wall open. The gate is about the
 * state of the answer, not the recency of the tap.
 *
 * `showAll` is deliberately sticky for the life of the mount: someone who
 * reopened the list to pick a second pattern should not have it slam shut under
 * the tick that picks it.
 *
 * ⚠️ **One consequence of the unmount is stated rather than fixed, on #2350's
 * PR:** the landing position is met on web only (`scrollNodeToTop`), and closing
 * it on native needs the `ScrollView` ref `MobileFormScreen` was ruled not to
 * forward - a ruling to reopen, not to route around. The other consequence,
 * keyboard focus falling to the document body with the row that was ticked, IS
 * fixed here, because this change is what introduces it.
 */
function PatternsBlock({ chosenKeys, onChange, error }: PatternsBlockProps) {
  const { t } = useTranslation("cbt");
  const [showAll, setShowAll] = useState(false);
  const blockRef = useRef<View>(null);
  const triggerRef = useRef<View>(null);
  const landAfterFold = useRef(false);

  /*
    ☠️ `Disclosure` is unanimated and UNMOUNTS its children (#716), so the tick
    that folds this block takes ~1,200px out from under the thumb in one frame,
    while the viewport is inside the region that goes. Everything above holds
    position; where the person lands is otherwise wherever the scroll offset
    clamps to, which is arithmetic rather than a decision - hence the block is
    put at the top of the scroll container instead, and that position is an
    acceptance criterion on #2350.

    ☠️ The row that was ticked is INSIDE what unmounts, so on web it is also the
    element that had keyboard focus - dropped to the document body by the same
    frame. Focus moves to the disclosure's trigger, which is the control that now
    stands for the sixteen that went, before the block is positioned: `focus()`
    scrolls on its own in a browser, so doing it the other way round would let it
    overwrite the landing position.

    No dependency array on purpose: the ref is the whole condition, this fires
    once per fold and the guard costs a boolean read on the other renders. It has
    to run after the collapse has been committed, which is what an effect is.
  */
  useEffect(() => {
    if (!landAfterFold.current) {
      return;
    }
    landAfterFold.current = false;
    focusNode(triggerRef.current);
    scrollNodeToTop(blockRef.current);
  });

  const chosen = distortionDefinitions.filter((distortion) => chosenKeys.includes(distortion.key));
  const folded = chosen.length > 0 && !showAll;

  const toggle = (key: string) => {
    const next = chosenKeys.includes(key)
      ? chosenKeys.filter((item) => item !== key)
      : [...chosenKeys, key];
    // The first tick on an open list is the one that folds it - and only that
    // one moves anybody. A tick inside a list the person reopened themselves
    // changes no heights.
    if (chosenKeys.length === 0 && next.length > 0 && !showAll) {
      landAfterFold.current = true;
    }
    // ☠️ Unticking the last pattern does not merely reopen the list - it puts
    // the block back to never-answered, `showAll` included. Left sticky, a
    // person who reopened the list, cleared it and then ticked again would get
    // no fold at all the second time: `folded` is `chosen.length > 0 && !showAll`
    // and nothing else ever puts `showAll` down.
    if (next.length === 0) {
      setShowAll(false);
    }
    onChange(next);
  };

  const rows = (
    <View className="gap-2">
      {distortionDefinitions.map((distortion) => (
        <CheckboxRow
          checked={chosenKeys.includes(distortion.key)}
          description={t(`distortions.${distortion.key}.shortDescription`)}
          key={distortion.key}
          label={t(`distortions.${distortion.key}.title`)}
          onToggle={() => toggle(distortion.key)}
          testID={`pattern-row-${distortion.key}`}
        />
      ))}
    </View>
  );

  return (
    <View className="gap-3" ref={blockRef} testID="patterns-block">
      <View className="gap-2">
        <Label>{t("record.patternsLabel")}</Label>
        {/* The hint is how to use the list. Folded, there is no list to use. */}
        {folded ? null : <Text variant="muted">{t("record.patternsChooseHint")}</Text>}
      </View>

      {folded ? (
        <View className="gap-2" testID="patterns-summary">
          <ChipRun>
            {chosen.map((distortion) => (
              <StaticChip key={distortion.key} label={t(`distortions.${distortion.key}.title`)} />
            ))}
          </ChipRun>
          {/*
            The description only at exactly one. It is the pattern's meaning,
            and two stacked descriptions are a second wall rather than a
            summary. ☠️ And the summary carries NO COUNT: "1 of 17" scores a
            person for how much of a list they ticked, which is not what the
            list is for (#2333).
          */}
          {chosen.length === 1 ? (
            <Text variant="muted">{t(`distortions.${chosen[0].key}.shortDescription`)}</Text>
          ) : null}
        </View>
      ) : null}

      {chosen.length === 0 ? (
        rows
      ) : (
        <Disclosure
          expanded={showAll}
          label={t("record.patternsShowAll")}
          onToggle={() => setShowAll((previous) => !previous)}
          testID="patterns-show-all"
          triggerRef={triggerRef}
        >
          {rows}
        </Disclosure>
      )}

      {error ? <Text variant="muted">{t(error)}</Text> : null}
    </View>
  );
}

export function DistortionsStep({ control, errors }: DistortionsStepProps) {
  return (
    <Controller
      control={control}
      name="distortions"
      /*
        ☠️ The fold's state and its effect live in the CHILD, not here.
        `Controller` re-renders its own render prop when the field changes and
        leaves this component alone - so an effect written at this level would
        never see the tick that folds the block.
      */
      render={({ field: { onChange, value } }) => (
        <PatternsBlock chosenKeys={value} onChange={onChange} error={errors.distortions?.message} />
      )}
    />
  );
}
