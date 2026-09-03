// Manual mock for @rn-primitives/popover - provides open/close state
// via React context so PopoverContent is conditionally rendered in tests.
const React = require("react");

const PopoverContext = React.createContext({ open: false, setOpen: () => {} });

exports.Root = function Root({ children, defaultOpen = false, onOpenChange }) {
  const [open, setOpen] = React.useState(defaultOpen);
  // ☠️ The mock used to drop `onOpenChange` on the floor while still opening and
  // closing correctly, so a component that relies on the callback looked simply
  // broken under jest and perfectly fine in the app (#1774 lost an hour to it).
  // The real Root is `setOpen(value); onOpenChangeProp?.(value);` - fired on
  // EVERY transition, unconditionally, including the imperative
  // `triggerRef.close()` path. Mirrored exactly rather than approximated.
  const handleOpenChange = React.useCallback(
    (value) => {
      setOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange],
  );
  const ctx = React.useMemo(() => ({ open, setOpen: handleOpenChange }), [open, handleOpenChange]);
  return React.createElement(PopoverContext.Provider, { value: ctx }, children);
};

exports.Trigger = React.forwardRef(function Trigger({ children, asChild }, ref) {
  const { setOpen, open } = React.useContext(PopoverContext);
  React.useImperativeHandle(ref, () => ({
    open: () => setOpen(true),
    close: () => setOpen(false),
  }));
  const handlePress = () => setOpen(!open);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onPress: handlePress });
  }
  return React.createElement("pressable", { onPress: handlePress }, children);
});

exports.Portal = function Portal({ children }) {
  return children || null;
};

exports.Overlay = function Overlay({ children }) {
  return children || null;
};

exports.Content = function Content({ children }) {
  const { open } = React.useContext(PopoverContext);
  return open ? children : null;
};

exports.useRootContext = function useRootContext() {
  return React.useContext(PopoverContext);
};
