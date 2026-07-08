/* Test-only: evaluates composite widget components the way the library's
   buildWidgetTree does (plain function calls — no hooks), yielding raw props. */
export interface TreeNode {
  type: string;
  props: any;
  children: TreeNode[];
}

export function widgetTree(el: any): TreeNode {
  if (el == null || typeof el === "string" || typeof el === "number") {
    return { type: "raw", props: { value: el }, children: [] };
  }
  let node = el;
  while (node.type && !node.type.__name__) node = node.type(node.props);
  const { children, ...props } = node.props ?? {};
  const arr = children ? (Array.isArray(children) ? children.flat(2) : [children]) : [];
  // Use the function's own name (e.g. "FlexWidget"), not the internal Android
  // layout class `__name__` the library stamps for its native bridge — those
  // diverge for FlexWidget specifically (__name__ === "LinearLayoutWidget" at
  // installed v0.20.3), which would make every widgetTree-based assertion in
  // this test suite (and every later card-view test) unable to match the
  // component it imported. TextWidget/IconWidget's __name__ already equals
  // their function name, so this is a no-op for them.
  return { type: node.type.name, props, children: arr.filter(Boolean).map(widgetTree) };
}

export function findAll(node: TreeNode, pred: (n: TreeNode) => boolean): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    if (pred(n)) out.push(n);
    n.children.forEach(walk);
  };
  walk(node);
  return out;
}

export const texts = (node: TreeNode): string[] =>
  findAll(node, (n) => n.type === "TextWidget").map((n) => n.props.text as string);

export const clickPaths = (node: TreeNode): string[] =>
  findAll(node, (n) => n.props?.clickActionData?.path != null).map(
    (n) => n.props.clickActionData.path as string,
  );
