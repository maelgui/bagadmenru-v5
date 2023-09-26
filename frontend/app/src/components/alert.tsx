import {
  faCheckCircle, faCircleExclamation, faCircleXmark, faInfo,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactNode } from 'react';

interface AlertProps {
  type: 'error' | 'warning' | 'success' | 'info';
  children: ReactNode;
}
export default function Alert({ type, children }: AlertProps) {
  let icon = null;
  let className = '';
  switch (type) {
    case 'error':
      icon = <FontAwesomeIcon icon={faCircleXmark} className="mr-4" />;
      className = 'bg-red-100 text-red-900';
      break;
    case 'warning':
      icon = <FontAwesomeIcon icon={faCircleExclamation} className="mr-4" />;
      className = 'bg-amber-100 text-amber-900';
      break;
    case 'success':
      icon = <FontAwesomeIcon icon={faCheckCircle} className="mr-4" />;
      className = 'bg-emerald-300 text-emerald-950';
      break;
    case 'info':
      icon = <FontAwesomeIcon icon={faInfo} className="mr-4" />;
      className = 'bg-sky-100 text-sky-950';
      break;
    default:
      break;
  }
  return (
    <div className={`py-4 px-6 mb-8 ${className}`}>
      {icon}
      {children}
    </div>
  );
}
