import { Platform } from "react-native";

/**
 * Platform IO for delivering the recovery-plan Markdown export.
 *
 * The two branches are kept byte-identical to the original inline implementation
 * that lived in the recovery screen:
 *  - web: build a Blob, click a temporary anchor to download, then revoke the URL.
 *  - native: dynamically import `Share` from react-native and open the share sheet.
 *
 * Isolated here so the only unavoidably-impure code path has one named home and the
 * `useRecoveryExport` hook stays thin glue.
 */
export async function deliverMarkdown(
  text: string,
  filename: string,
  title: string,
): Promise<void> {
  if (Platform.OS === "web") {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  } else {
    const { Share } = await import("react-native");
    await Share.share({
      message: text,
      title,
    });
  }
}
