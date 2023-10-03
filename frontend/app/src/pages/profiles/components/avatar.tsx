/* eslint-disable react/jsx-props-no-spreading */
import { Profile } from 'bagad-client';
import { UseControllerProps, useController } from 'react-hook-form';

export default function AvatarInput(props: UseControllerProps<Profile>) {
  const { field, fieldState } = useController(props);
  const { name } = props;
  console.log(props);

  return (
    <div>
      <input {...field} type="file" placeholder={name} />
      {field.value}
      <p>{fieldState.isTouched && 'Touched'}</p>
      <p>{fieldState.isDirty && 'Dirty'}</p>
      <p>{fieldState.invalid ? 'invalid' : 'valid'}</p>
    </div>
  );
}
