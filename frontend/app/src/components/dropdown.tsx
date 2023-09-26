/* eslint-disable react/jsx-props-no-spreading */
import {
  FloatingFocusManager,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { useState } from 'react';
import Button from './button';

export default function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
    middleware: [offset(5), flip(), shift()],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  // Merge all the interactions into prop getters
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  return (
    <>
      <Button type="button" ref={refs.setReference} {...getReferenceProps()}>
        Reference element
      </Button>
      {isOpen && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            className="flex flex-col p-1 rounded border bg-white shadow"
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <Button variant="ghost">Renomer</Button>
            <Button variant="ghost">Déplacer</Button>
            <hr className="mx-2 my-1" />
            <Button variant="ghost">Supprimer</Button>
          </div>
        </FloatingFocusManager>
      )}
    </>
  );
}
