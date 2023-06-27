import Button, { ButtonProps } from './button';

interface HeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode | undefined
  actions?: React.ReactElement<HeaderActionProps>[]
}

interface HeaderActionProps extends ButtonProps<'button'> {
  children: React.ReactNode
}

function HeaderAction({ children, ...rest }: HeaderActionProps) {
  return (
    <Button
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    >
      {children}
    </Button>
  );
}

export default function Header({
  title,
  subtitle = undefined,
  actions = [],
}: HeaderProps) {
  return (
    <div className="flex justify-between items-start pt-12 pb-16">
      <div>
        <h2 className="text-4xl">{title}</h2>
        <h4 className="text-lg text-gray-500">{subtitle}</h4>
      </div>
      <div className="m-l-auto text-right">
        {actions.map((action) => action)}
      </div>
    </div>
  );
}

Header.Action = HeaderAction;
