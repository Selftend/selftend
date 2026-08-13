/**
 * A miniature i18next over a *real* shipped locale bundle: resolves a namespace-prefixed
 * key and interpolates `{{name}}` placeholders. No plurals, no contexts — just enough for
 * tests that assert on a formatted string.
 *
 * The point is that it reads the shipped JSON rather than a stub. A unit template added to
 * `en` and forgotten in `bg` fails here, at the assertion, instead of shipping; a stub `t`
 * returning its own key would have happily passed. That is why an unresolved key throws by
 * default rather than echoing.
 *
 * Only keys carrying this bundle's own `namespace:` prefix are resolved. Everything else
 * goes to `onMissing`, so a subject that also asks for keys from other namespaces (the
 * widget snapshot builder asks for dozens) can keep its existing stub for those without
 * this translator silently answering on their behalf.
 */
export function bundleTranslator(
  namespace: string,
  bundle: object,
  onMissing: (key: string, opts?: Record<string, unknown>) => string = (key) => {
    throw new Error(`missing ${namespace} translation key: ${key}`);
  },
): (key: string, opts?: Record<string, unknown>) => string {
  const prefix = `${namespace}:`;

  return (key, opts) => {
    if (!key.startsWith(prefix)) return onMissing(key, opts);

    let node: unknown = bundle;
    for (const segment of key.slice(prefix.length).split(".")) {
      node = (node as Record<string, unknown> | undefined)?.[segment];
    }
    if (typeof node !== "string") return onMissing(key, opts);

    return node.replace(/{{(\w+)}}/g, (_, name: string) => String(opts?.[name] ?? ""));
  };
}
