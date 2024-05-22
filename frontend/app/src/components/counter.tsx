import { ReactNode } from 'react';

interface CounterProps {
  type: 'error' | 'warning' | 'success' | 'info';
  description: string;
  value: number | ReactNode;
}

export default function Counter({ type, description, value }: CounterProps) {
  let className = '';
  switch (type) {
    case 'error':
      className = 'bg-red-100 text-red-900';
      break;
    case 'warning':
      className = 'bg-amber-100 text-amber-900';
      break;
    case 'success':
      className = 'bg-emerald-100  text-emerald-950';
      break;
    case 'info':
      className = 'bg-sky-100 text-sky-950';
      break;
    default:
      break;
  }
  return (
    <div className={`py-4 px-6 ${className} text-center flex flex-col items-center rounded-lg`}>
      <div className="text-4xl m-5">{value}</div>
      <div>{description}</div>
    </div>
  );
}
