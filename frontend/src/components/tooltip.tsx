/* eslint-disable react/jsx-props-no-spreading */
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { ElementType, ReactNode, useState } from 'react';

export default function Tooltip(
  { children, content, as }: { children: ReactNode, content: ReactNode, as: ElementType },
) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    // Make sure the tooltip stays on the screen
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(5),
      flip({
        fallbackAxisSideDirection: 'start',
      }),
      shift(),
    ],
  });

  // Event listeners to change the open state
  const hover = useHover(context, { move: false });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  // Role props for screen readers
  const role = useRole(context, { role: 'tooltip' });

  // Merge all the interactions into prop getters
  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ]);

  const Component = as || 'span';

  if (!content) {
    return children;
  }

  return (
    <>
      <Component ref={refs.setReference} {...getReferenceProps()}>
        {children}
      </Component>
      <FloatingPortal>
        {isOpen && (
          <div
            className="bg-gray-900 text-center px-4 py-2 opacity-95 text-white text-sm rounded-sm"
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            {content}
          </div>
        )}
      </FloatingPortal>
    </>
  );
}
