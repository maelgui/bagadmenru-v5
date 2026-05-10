
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
  useMergeRefs,
  useRole,
} from '@floating-ui/react';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import Button from './button';

// export default function Dropdown() {
//   const [isOpen, setIsOpen] = useState(false);

//   const bind = useLongPress(() => {
//     setIsOpen(true);
//   }, { detect: LongPressEventType.Touch });

//   const { refs, floatingStyles, context } = useFloating({
//     open: isOpen,
//     onOpenChange: setIsOpen,
//     placement: 'bottom-end',
//     whileElementsMounted: autoUpdate,
//     middleware: [offset(5), flip(), shift()],
//   });

//   const click = useClick(context);
//   const dismiss = useDismiss(context);
//   const role = useRole(context);

//   // Merge all the interactions into prop getters
//   const { getReferenceProps, getFloatingProps } = useInteractions([
//     click,
//     dismiss,
//     role,
//   ]);

//   return (
//     <>
//       <Button type="button" ref={refs.setReference} {...getReferenceProps()}>
//         Reference element
//       </Button>
//       {isOpen && (
//         <FloatingFocusManager context={context} modal={false}>
//           <div
//             ref={refs.setFloating}
//             className="flex flex-col p-1 rounded border bg-white shadow"
//             style={floatingStyles}
//             {...getFloatingProps()}
//           >
//             <Button variant="ghost">Renommer</Button>
//             <Button variant="ghost">Déplacer</Button>
//             <hr className="mx-2 my-1" />
//             <Button variant="ghost">Supprimer</Button>
//           </div>
//         </FloatingFocusManager>
//       )}
//     </>
//   );
// }

interface DropdownOptions {
  open?: boolean;
}

export function useDropdown({ open: controlledOpen }: DropdownOptions) {
  const [uncontrolledOpen, setOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;

  const data = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
    // eslint-disable-next-line @typescript-eslint/no-magic-numbers -- pixel offset value for floating UI positioning
    middleware: [offset(5), flip(), shift()],
  });

  const { context } = data;

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  // Merge all the interactions into prop getters
  const interactions = useInteractions([
    click,
    dismiss,
    role,
  ]);

  return React.useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
    }),
    [open, setOpen, interactions, data],
  );
}

type ContextType = ReturnType<typeof useDropdown> | null;
const DropdownContext = React.createContext<ContextType>(null);

export const useDropdownContext = () => {
  const context = React.useContext(DropdownContext);

  if (context == null) {
    throw new Error('Dropdown components must be wrapped in <Dropdown />');
  }

  return context;
};

export default function Dropdown({
  children,
  ...options
}: { children: React.ReactNode } & DropdownOptions) {
  // This can accept any props as options, e.g. `placement`,
  // or other positioning options.
  const tooltip = useDropdown(options);
  return (
    <DropdownContext.Provider value={tooltip}>
      {children}
    </DropdownContext.Provider>
  );
}

interface DropdownTriggerProps extends React.ComponentPropsWithoutRef<'span'> {
  asChild?: boolean,
  ref?: React.Ref<HTMLElement>,
}
export function DropdownTrigger(
  { children, asChild = false, ref: propRef, ...props }: DropdownTriggerProps,
) {
  const context = useDropdownContext();
  const childrenRef = React.isValidElement<{ ref?: React.Ref<unknown> }>(children)
    ? children.props.ref
    : undefined;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (asChild && React.isValidElement<Record<string, unknown>>(children)) {
    const mergedProps = context.getReferenceProps({
      ...props,
      ...children.props,
    });

    return React.cloneElement(children, {
      ...mergedProps,
      ref,
      'data-state': context.open ? 'open' : 'closed',
    });
  }

  return (
    <button
      ref={ref}
      type="button"
      // The user can style the trigger based on the state
      data-state={context.open ? 'open' : 'closed'}
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  );
}

interface DropdownContentProps extends React.HTMLProps<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement>,
}
export function DropdownContent({ style, ref: propRef, ...props }: DropdownContentProps) {
  const context = useDropdownContext();
  const ref = useMergeRefs([context.refs.setFloating, propRef]);

  if (!context.open) return null;

  return (
    <FloatingFocusManager context={context.context} modal={false}>
      <div
        ref={ref}
        className="flex flex-col p-1 rounded border bg-white shadow z-10"
        style={{
          ...context.floatingStyles,
          ...style,
        }}
        {...context.getFloatingProps(props)}
      />
    </FloatingFocusManager>
  );
}

type DropdownItemProps = {
  icon?: IconProp
  important?: boolean
} & Omit<React.HTMLProps<HTMLButtonElement>, 'size' | 'as' | 'type'>;

export function DropdownItem(
  {
    icon = undefined, important = false, children, ...props
  }: DropdownItemProps,
) {
  return (
    <Button as="button" {...props} variant="ghost" className={`text-left ${important ? 'text-red-600' : ''} capitalize font-medium`}>
      {icon
        ? <FontAwesomeIcon icon={faTrashCan} className="mr-3 w-4" />
        : <span className="mr-3 w-4 inline-block" />}
      {children}
    </Button>

  );
}
