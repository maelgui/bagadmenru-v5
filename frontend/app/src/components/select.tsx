import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { forwardRef } from 'react';

type PrivateSelectProps = {
  error?: string;
} & React.ComponentPropsWithoutRef<'select'>;

function PrivateSelect(
  { error = undefined, ...rest }: PrivateSelectProps,
  ref: React.ForwardedRef<HTMLSelectElement>,
) {
  return (
    <>
      <select
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

const Select = forwardRef<HTMLSelectElement, PrivateSelectProps>(PrivateSelect);
export default Select;
