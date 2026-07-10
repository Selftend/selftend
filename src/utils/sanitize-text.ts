// Sanitizes free text the user typed (or pasted) before it is stored.
//
// - U+00A0 non-breaking spaces arrive constantly via paste from web pages and
//   word processors. They render like spaces but break search, wrapping, and
//   string comparisons - normalize them to regular spaces.
// - U+200B zero-width spaces (pasted invisibly from web content, then breaking
//   equality checks and lengths) and U+FEFF (BOM / zero-width no-break space)
//   are invisible and carry no meaning in user prose - drop them.
//   U+200C/U+200D (ZWNJ/ZWJ) are deliberately KEPT: ZWJ glues emoji sequences
//   together and ZWNJ is meaningful in several scripts.
// - C0 control characters (except tab and newline) plus DEL never belong in
//   prose; they arrive via binary-ish pastes and corrupt JSON/Postgres text.
//   Windows line endings are normalized to newline FIRST so removing lone
//   carriage returns cannot glue two lines together.
// - Unpaired UTF-16 surrogates (half of an emoji cut by a maxLength truncation,
//   or hostile input) are not valid Unicode text: they cannot be encoded as
//   UTF-8, so they corrupt JSON payloads and Postgres text round-trips. Drop
//   them; a paired surrogate (a real emoji) is untouched.
const ZERO_WIDTH_REGEX = /[\u200B\uFEFF]/g;
const CONTROL_CHAR_REGEX = /[\u0000-\u0008\u000B-\u001F\u007F]/g;
const UNPAIRED_SURROGATE_REGEX =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

export function sanitizeUserText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(ZERO_WIDTH_REGEX, "")
    .replace(CONTROL_CHAR_REGEX, "")
    .replace(UNPAIRED_SURROGATE_REGEX, "");
}
