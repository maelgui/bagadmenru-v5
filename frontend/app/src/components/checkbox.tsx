/* eslint-disable react/jsx-props-no-spreading */
import { faSquare, faSquareCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  title: string
  description: string
  id: string
}

export default function Checkbox({
  title, description, className, id, ...rest
}: CheckboxProps) {
  return (
    <div className="relative">
      <input
        type="checkbox"
        id={id}
        {...rest}
        className="hidden peer"
      />

      <label htmlFor={id} className={`block p-4 pl-16 cursor-pointer rounded border-2 ring-2 ring-transparent ring-offset-2 peer-checked:border-pourpre-500 hover:bg-gray-50 active:ring-pourpre-200 focus:ring-pourpre-200 focus:ring-offset-0 ${className}`}>
        <span className="mb-2 block font-semibold">{title}</span>
        <p className="text-gray-600">{description}</p>
      </label>
      <FontAwesomeIcon className="absolute invisible top-4 left-4 md:top-8 md:left-8 peer-checked:visible text-pourpre-500" icon={faSquareCheck} />
      <FontAwesomeIcon className="absolute visible top-4 left-4 md:top-8 md:left-8 peer-checked:invisible text-gray-200" icon={faSquare} />
    </div>
  );
}
