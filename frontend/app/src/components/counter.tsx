interface CounterProps {
  type: 'error' | 'warning' | 'success' | 'info';
  description: string;
  value: number;
}

export default function Counter({ type, description, value }: CounterProps) {
  let className = '';
  switch (type) {
    case 'error':
      className = 'border border-b-4 border-red-700 text-red-900';
      break;
    case 'warning':
      className = 'border border-b-4 border-amber-700 text-amber-900';
      break;
    case 'success':
      className = 'border border-b-4 border-emerald-700 text-emerald-950';
      break;
    case 'info':
      className = 'border border-b-4 border-sky-700 text-sky-950';
      break;
    default:
      break;
  }
  return (
    <div className={`py-4 px-6 ${className} text-center flex flex-col items-center`}>
      <div className="text-4xl m-5">{value}</div>
      <div>{description}</div>
    </div>
  );
}
