import { z } from "zod";

const nonEmptyTrimmedString = (max = 2000) => z.string().trim().min(1).max(max);

export const trimmedStringList = (max = 2000) => z.array(nonEmptyTrimmedString(max));
