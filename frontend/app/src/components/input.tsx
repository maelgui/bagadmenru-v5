import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { forwardRef } from 'react';

interface PrivateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}
function PrivateInput(
  { error = undefined, ...rest }: PrivateInputProps,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  return (
    <>
      <input
        ref={ref}
        className={`block w-full border-gray-200 rounded py-2 px-4 border-2 focus:outline-none focus:bg-white focus:border-pourpre-400 hover:bg-gray-50 invalid:border-red-600 ${error ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed`}
        aria-invalid={error ? 'true' : 'false'}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...rest}
      />
      {error ? (
        <p className="py-2 text-red-500 text-sm">
          <FontAwesomeIcon icon={faCircleExclamation} />
          {' '}
          {error}
        </p>
      ) : null}
    </>
  );
}

const Input = forwardRef<HTMLInputElement, PrivateInputProps>(PrivateInput);
export default Input;
