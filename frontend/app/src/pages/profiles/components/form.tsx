/* eslint-disable react/jsx-props-no-spreading */
import { Profile } from 'bagad-client';
import { SubmitHandler, useForm } from 'react-hook-form';
import Button from '../../../components/button';
import Input from '../../../components/input';

export default function EditProfileForm({ profile }: { profile: Profile }) {
  const {
    register, handleSubmit,
  } = useForm<Profile>({ defaultValues: profile });
  const onSubmit: SubmitHandler<Profile> = (data) => console.log(data);
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="mb-2 block font-semibold" htmlFor="first_name">Prénom</label>
          <Input
            type="text"
            id="first_name"
            disabled
            {...register('firstName')}
          />
        </div>
        <div className="flex-1">
          <label className="mb-2 block font-semibold" htmlFor="last_name">Nom</label>
          <Input
            type="text"
            id="last_name"
            disabled
            {...register('lastName')}
          />
        </div>
      </div>
      <div className="flex items-end gap-4 mb-6">
        <div className="flex-1">
          <label className="mb-2 block font-semibold" htmlFor="email">E-mail</label>
          <Input
            type="email"
            id="email"
            disabled
            {...register('email')}
          />
        </div>
        <div>
          <Button as="a" href={`${import.meta.env.VITE_OIDC_PROVIDER_URL}/account`}>Modifier ces informations</Button>
        </div>
      </div>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="picture">Avatar</label>
        <Input
          type="file"
          id="picture"
          {...register('picture')}
        />
      </div>
    </form>
  );
}
