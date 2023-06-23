import { faCheck, faQuestion, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactEventHandler } from 'react';

export default function Checkbox({
  value,
  disabled = false,
  onClick,
}: {
  disabled: boolean,
  value: boolean | undefined,
  onClick: ReactEventHandler,
}) {
  let className;
  let content;
  if (value === true) {
    content = <FontAwesomeIcon icon={faCheck} className="text-emerald-800" />;
    className = 'bg-emerald-300';
  } else if (value === false) {
    content = <FontAwesomeIcon icon={faXmark} className="text-red-900" />;
    className = 'bg-red-300';
  } else if (value === undefined) {
    content = <FontAwesomeIcon icon={faQuestion} className="text-sky-800" />;
    className = 'bg-sky-200';
  }

  if (disabled) {
    return <td className={`${className} px-4 py-2 text-center border-4 border-white`}>{content}</td>;
  }

  return (
    <td className={`${className} px-4 py-2 text-center border-4 border-white`}>
      <span
        role="checkbox"
        aria-checked={value}
        tabIndex={0}
        className="inline-block h-6 w-6 cursor-pointer bg-white m-auto border-2 focus:border-pourpre-500"
        onClick={onClick}
        onKeyDown={(e) => ((e.key === 'Space') ? onClick(e) : null)}
      >
        {content}
      </span>
    </td>
  );
}
