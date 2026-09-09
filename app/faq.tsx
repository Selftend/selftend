import { FaqScreen } from "@/src/features/policies/faq-screen";

/**
 * `/faq` stopped rendering through `InfoScreen` on #2147.
 *
 * It is the one policy route whose body is not a flat list of section cards: the
 * eight group answers collapse while every question, the crisis guidance and the
 * parents' letter stay open. The screen itself lives beside the rest of the
 * policy feature, so the route file stays what the other six are - a route.
 */
export default function Faq() {
  return <FaqScreen />;
}
