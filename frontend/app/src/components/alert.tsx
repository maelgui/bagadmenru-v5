import { faCheckCircle, faCircleExclamation, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactNode } from 'react';

interface AlertProps {
  type: 'error' | 'warning' | 'success';
  children: ReactNode;
}
export default function Alert({ type, children }: AlertProps) {
  return (
    <div className={`py-4 px-6 mb-8 ${type === 'error' ? 'bg-red-100 text-red-900' : ''} ${type === 'warning' ? 'bg-amber-100 text-amber-900' : ''} ${type === 'success' ? 'bg-emerald-300 text-emerald-950' : ''}`}>
      {type === 'error' ? <FontAwesomeIcon icon={faCircleXmark} className="mr-4" /> : null}
      {type === 'warning' ? <FontAwesomeIcon icon={faCircleExclamation} className="mr-4" /> : null}
      {type === 'success' ? <FontAwesomeIcon icon={faCheckCircle} className="mr-4" /> : null}
      {children}
    </div>
  );
}
