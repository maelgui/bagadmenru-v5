/* eslint-disable react/jsx-props-no-spreading */
import { ReactNode } from 'react';

type CounterProps = {
  type: 'error' | 'warning' | 'success' | 'info' | 'ghost';
  description: string;
  value: number | ReactNode;
} & React.ComponentPropsWithoutRef<'div'>;

export default function Counter({
  type, description, value, className, ...rest
}: CounterProps) {
  let bgClassName = '';
  switch (type) {
    case 'error':
      bgClassName = 'bg-red-100 text-red-900';
      break;
    case 'warning':
      bgClassName = 'bg-amber-100 text-amber-900';
      break;
    case 'success':
      bgClassName = 'bg-emerald-100  text-emerald-950';
      break;
    case 'info':
      bgClassName = 'bg-sky-100 text-sky-950';
      break;
    case 'ghost':
      bgClassName = 'bg-gray-100 text-gray-950';
      break;
    default:
      break;
  }
  return (
    <div className={`py-4 px-6 ${bgClassName} ${className} text-center flex flex-col items-center rounded-lg`} {...rest}>
      <div className="text-4xl m-5">{value}</div>
      <div>{description}</div>
    </div>
  );
}
