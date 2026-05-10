import { faCheck, faQuestion, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { ReactEventHandler } from 'react';

export default function Checkbox({
  value,
  disabled = false,
  onClick,
}: {
  disabled?: boolean,
  value: boolean | undefined,
  onClick: ReactEventHandler,
}) {
  let className = 'bg-sky-200';
  let content = <FontAwesomeIcon icon={faQuestion} className="text-sky-800" />;
  if (value === true) {
    content = <FontAwesomeIcon icon={faCheck} className="text-emerald-800" />;
    className = 'bg-emerald-300';
  } else if (value === false) {
    content = <FontAwesomeIcon icon={faXmark} className="text-red-900" />;
    className = 'bg-red-300';
  }

  if (disabled) {
    return <td className={`${className} h-8 text-center border-4 border-white`}>{content}</td>;
  }

  return (
    <td className={`${className} h-8 text-center border-4 border-white`}>
      <span
        role="checkbox"
        aria-checked={value}
        tabIndex={0}
        className="flex h-6 w-6 cursor-pointer bg-white m-auto border-2 focus:border-pourpre-500 justify-center items-center"
        onClick={onClick}
        onKeyDown={(e) => ((e.key === 'Space') ? onClick(e) : null)}
      >
        {content}
      </span>
    </td>
  );
}
