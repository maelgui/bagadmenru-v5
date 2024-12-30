import {
  faCheckCircle, faCircleExclamation, faCircleXmark, faInfo,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactNode } from 'react';

interface AlertProps extends React.ComponentPropsWithoutRef<'div'> {
  type: 'error' | 'warning' | 'success' | 'info' | 'gradient';
  children: ReactNode;
}
export default function Alert({ type, children, ...rest }: AlertProps) {
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
    case 'gradient':
      icon = <FontAwesomeIcon icon={faInfo} className="mr-4" />;
      className = 'bg-gradient-to-r from-[#ffe3f3] to-[#c1dfff]';
      break;
    default:
      break;
  }
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <div className={`relative py-4 px-6 mb-8 ${className}`} {...rest}>
      <span className="absolute top-0 bottom-0 flex items-center">{icon}</span>
      <div className="pl-6">{children}</div>
    </div>
  );
}
