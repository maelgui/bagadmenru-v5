/* eslint-disable react/jsx-props-no-spreading */
import {
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  useClick,
  useDismiss,
  useFloating,
  useId,
  useInteractions,
  useMergeRefs,
  useRole,
} from '@floating-ui/react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as React from 'react';

interface DialogOptions {
  initialOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function useDialog({
  initialOpen = false,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: DialogOptions = {}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(initialOpen);
  const [labelId, setLabelId] = React.useState<string | undefined>();
  const [descriptionId, setDescriptionId] = React.useState<string | undefined>();

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = setControlledOpen ?? setUncontrolledOpen;

  const data = useFloating({
    open,
    onOpenChange: setOpen,
  });

  const { context } = data;

  const click = useClick(context, {
    enabled: controlledOpen == null,
  });
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context);

  const interactions = useInteractions([click, dismiss, role]);

  return React.useMemo(
    () => ({
      open,
      setOpen,
      ...interactions,
      ...data,
      labelId,
      descriptionId,
      setLabelId,
      setDescriptionId,
    }),
    [open, setOpen, interactions, data, labelId, descriptionId],
  );
}

type ContextType =
  | (ReturnType<typeof useDialog> & {
    setLabelId: React.Dispatch<React.SetStateAction<string | undefined>>;
    setDescriptionId: React.Dispatch<React.SetStateAction<string | undefined>>;
  })
  | null;

const DialogContext = React.createContext<ContextType>(null);

export const useDialogContext = () => {
  const context = React.useContext(DialogContext);

  if (context == null) {
    throw new Error('Dialog components must be wrapped in <Dialog />');
  }

  return context;
};

export function Dialog({
  children,
  ...options
}: {
  children: React.ReactNode;
} & DialogOptions) {
  const dialog = useDialog(options);
  return (
    <DialogContext.Provider value={dialog}>{children}</DialogContext.Provider>
  );
}
interface DialogTriggerProps extends React.HTMLProps<HTMLButtonElement> {
}

export const DialogTrigger = React.forwardRef<HTMLElement, DialogTriggerProps>((
  { children, ...props }: DialogTriggerProps,
  propRef: React.Ref<HTMLElement>,
) => {
  const context = useDialogContext();
  const childrenRef = (children as any).ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  // if (asChild && React.isValidElement(children)) {
  //   return React.cloneElement(
  //     children,
  //     context.getReferenceProps({
  //       ref,
  //       ...props,
  //       ...children.props,
  //       'data-state': context.open ? 'open' : 'closed',
  //     }),
  //   );
  // }

  return (
    <button
      type="button"
      ref={ref}
      // The user can style the trigger based on the state
      data-state={context.open ? 'open' : 'closed'}
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  );
});
DialogTrigger.displayName = 'DialogTrigger';

export const DialogContent = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  (props, propRef) => {
    const { context: floatingContext, ...context } = useDialogContext();
    const ref = useMergeRefs([context.refs.setFloating, propRef]);

    if (!floatingContext.open) return null;

    return (
      <FloatingPortal>
        <FloatingOverlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-50" lockScroll>
          <FloatingFocusManager context={floatingContext}>
            <div className={`flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0 ${props.className}`}>
              <div
                ref={ref}
                aria-labelledby={context.labelId}
                aria-describedby={context.descriptionId}
                {...context.getFloatingProps(props)}
                className="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all sm:my-8 w-full sm:w-1/3 px-4 pb-4 pt-5 sm:p-6 sm:pb-4"
              >
                {props.children}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      </FloatingPortal>
    );
  },
);
DialogContent.displayName = 'DialogContent';

// eslint-disable-next-line max-len
export const DialogHeading = React.forwardRef<HTMLHeadingElement, React.HTMLProps<HTMLHeadingElement>>(
  ({ children, ...props }, ref) => {
    const { setLabelId } = useDialogContext();
    const id = useId();

    // Only sets `aria-labelledby` on the Dialog root element
    // if this component is mounted inside it.
    React.useLayoutEffect(() => {
      setLabelId(id);
      return () => setLabelId(undefined);
    }, [id, setLabelId]);

    return (
      <h3 {...props} ref={ref} id={id} className="mb-4 text-base font-semibold leading-6 text-gray-900">
        {children}
      </h3>
    );
  },
);

DialogHeading.displayName = 'DialogHeading';

// eslint-disable-next-line max-len
export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLProps<HTMLParagraphElement>>(
  ({ children, ...props }, ref) => {
    const { setDescriptionId } = useDialogContext();
    const id = useId();

    // Only sets `aria-describedby` on the Dialog root element
    // if this component is mounted inside it.
    React.useLayoutEffect(() => {
      setDescriptionId(id);
      return () => setDescriptionId(undefined);
    }, [id, setDescriptionId]);

    return (
      <p {...props} ref={ref} id={id}>
        {children}
      </p>
    );
  },
);

DialogDescription.displayName = 'DialogDescription';

// eslint-disable-next-line max-len
export const DialogClose = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  (props, ref) => {
    const { setOpen } = useDialogContext();
    return (
      <button className="absolute top-4 right-4 w-4 h-4" type="button" {...props} ref={ref} onClick={() => setOpen(false)}>
        <FontAwesomeIcon icon={faXmark} className="w-4 h-4 block text-gray-700" />
      </button>
    );
  },
);

DialogClose.displayName = 'DialogClose';
