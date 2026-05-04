import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { forwardRef, useState } from 'react';

interface PrivateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}
function PrivateInput(
  {
    error = undefined, className = undefined, type, ...rest
  }: PrivateInputProps,
  ref: React.ForwardedRef<HTMLInputElement>,
) {
  const [currentType, setCurrentTypt] = useState(type);
  const toogleType = () => {
    if (currentType === 'password') {
      setCurrentTypt('text');
    } else {
      setCurrentTypt('password');
    }
  };
  return (
    <>
      <div
        className="relative"
      >
        <input
          ref={ref}
          className={`block w-full border-gray-200 rounded py-2 px-4 border focus:outline-none focus:bg-white focus:border-pourpre-400 focus:ring-1 focus:ring-pourpre-400 hover:bg-gray-50 invalid:border-red-600 ${error ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed ${className ?? ''}`}
          aria-invalid={error ? 'true' : 'false'}
          type={currentType}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...rest}
        />
        {type === 'password' ? (
          <button
            onClick={toogleType}
            type="button"
            aria-label="Afficher/cacher le mot de passe"
            className="absolute top-0 right-0 bottom-0 p-2 px-4 grid place-content-center cursor-pointer text-gray-500"
          >
            <span className="font-semibold text-xs uppercase">
              {currentType === 'password'
                ? 'Afficher'
                : 'Cacher'}
            </span>
            {/* <span className="text-center w-8">
              {currentType === 'password'
                ? <FontAwesomeIcon icon={faEye} />
                : <FontAwesomeIcon icon={faEyeSlash} />}
            </span> */}
          </button>
        ) : null}
      </div>
      {
        error ? (
          <p className="py-2 text-red-500 text-sm">
            <FontAwesomeIcon icon={faCircleExclamation} />
            {' '}
            {error}
          </p>
        ) : null
      }
    </>
  );
}

const Input = forwardRef<HTMLInputElement, PrivateInputProps>(PrivateInput);
export default Input;
