export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'll'
  outline?: boolean
}

export default function Button({
  children, size = 'md', outline = false, ...rest
}: ButtonProps) {
  const classList = [];
  switch (size) {
    case 'sm':
      classList.push('py-1', 'px-2', 'text-xs', 'font-semibold');
      break;
    case 'md':
      classList.push('py-2', 'px-4');
      break;
    case 'lg':
      classList.push('py-3', 'px-6');
      break;

    default:
      break;
  }
  if (outline) {
    classList.push('bg-white', 'text-pourpre-600', 'hover:border-pourpre-200', 'hover:bg-pourpre-400', 'hover:text-white');
  } else {
    classList.push('bg-pourpre-500', 'text-white', 'hover:border-pourpre-200', 'hover:bg-white', 'hover:text-pourpre-600');
  }
  return (
    <button
      type="button"
      className={`${classList.join(' ')} border border-pourpre-500 uppercase transition m-1 font-bold text-sm`}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...rest}
    >
      {children}
    </button>
  );
}
