import Head from "expo-router/head";
import { useTranslation } from "react-i18next";

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
  const { i18n } = useTranslation();
  return (
    <>
      {/* PROTOTYPE (#2286): a per-route head. Throwaway copy, English only. */}
      <Head>
        <title>Questions about Selftend - the FAQ</title>
        <meta
          name="description"
          content="PROTOTYPE-FAQ-DESCRIPTION: what Selftend is, who it is for, and how the CBT programme and the everyday tools fit together."
        />
        <meta property="og:title" content="Questions about Selftend - the FAQ" />
        <link rel="canonical" href="https://selftend.org/faq" />
        <html lang={i18n.language} />
      </Head>
      <FaqScreen />
    </>
  );
}
