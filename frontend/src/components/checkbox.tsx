import { faCheck, faQuestion, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useFetcher } from 'react-router-dom';

export default function Checkbox({
  value,
  eventId,
  disabled = false,
}: {
  disabled: boolean,
  eventId: number,
  value: boolean | undefined,
}) {
  const fetcher = useFetcher();

  const state = fetcher.formData ? (fetcher.formData.get('value') === 'true') : value;

  let content;
  let className;
  if (state === true) {
    content = <FontAwesomeIcon icon={faCheck} className="text-emerald-800" />;
    className = 'bg-emerald-300';
  } else if (state === false) {
    content = <FontAwesomeIcon icon={faXmark} className="text-red-900" />;
    className = 'bg-red-300';
  } else if (state === undefined) {
    content = <FontAwesomeIcon icon={faQuestion} className="text-sky-800" />;
    className = 'bg-sky-200';
  }

  if (disabled) {
    return <td className={`${className} px-4 py-2 text-center border-4 border-white`}>{content}</td>;
  }

  return (
    <td className={`${className} px-4 py-2 text-center border-4 border-white`}>
      <fetcher.Form>
        <span
          role="checkbox"
          aria-checked={value}
          tabIndex={0}
          className="inline-block h-6 w-6 cursor-pointer bg-white m-auto"
          onClick={() => fetcher.submit({ eventId: eventId.toString(), value: String(state === undefined ? false : !state) }, { method: 'post', action: '/events/doodle' })}
          onKeyDown={() => fetcher.submit({ eventId: eventId.toString(), value: String(state === undefined ? false : !state) }, { method: 'post', action: '/events/doodle' })}
        >
          {content}
        </span>
      </fetcher.Form>
    </td>
  );
}
