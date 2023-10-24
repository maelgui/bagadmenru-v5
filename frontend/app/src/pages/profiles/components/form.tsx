/* eslint-disable react/jsx-props-no-spreading */
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Profile, ProfileUpdate } from 'bagad-client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import Avatar from '../../../components/avatar';
import Button from '../../../components/button';
import Input from '../../../components/input';
import Select from '../../../components/select';
import { queryClient, useApiClient } from '../../../config/client';

export default function EditProfileForm({ profile }: { profile: Profile }) {
  const { usersApi } = useApiClient();

  const { data: instruments } = useQuery({
    queryKey: ['instruments'],
    queryFn: () => usersApi.listInstrumentsApiV1InstrumentsGet(),
  });

  const {
    register, handleSubmit, setValue,
  } = useForm<ProfileUpdate>({ defaultValues: profile });

  const [pictureUrl, setPictureUrl] = useState<string | null>(profile.pictureUrl);

  const onUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // Call API to BE to generate a pre-signed url to upload file object
    Array.from(event.target.files ?? [])?.map(async (file) => {
      const presignedUploadUrl = await usersApi.uploadAvatarApiV1ProfilesMeAvatarPost();
      await axios.put(
        presignedUploadUrl.url,
        file,
        {
          headers: {
            'X-Amz-Tagging': new URLSearchParams({ user_id: profile.id, temp: 'true' }).toString(),
            //             `temp=true&user=${users.id}`,
          },
        },
      );
      setPictureUrl(URL.createObjectURL(file));
      setValue('pictureKey', presignedUploadUrl.key);
    });
  };

  const { mutate } = useMutation({
    mutationFn: (data: ProfileUpdate) => usersApi.updateMyProfileApiV1ProfilesMePut({
      profileUpdate: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
      toast.success('Profile modifié avec succès !');
    },
  });
  const onSubmit = (data: ProfileUpdate) => mutate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="text-center mb-6">
        <div className="inline-block m-auto relative my-8">
          <Avatar src={pictureUrl} size="lg" />
          <label htmlFor="pictureFileInput" className="cursor-pointer m-4 absolute right-0 bottom-0 rounded-full bg-white h-12 w-12 flex justify-center items-center shadow-lg">
            <FontAwesomeIcon icon={faEdit} />
          </label>
        </div>
        <input
          type="file"
          id="pictureFileInput"
          accept="image/*"
          onChange={onUploadAvatar}
          className="hidden"
        />
        <input
          type="text"
          id="picture"
          {...register('pictureKey')}
          disabled
          className="hidden"
        />

      </div>
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="mb-2 block font-semibold" htmlFor="first_name">Prénom</label>
          <Input
            type="text"
            id="first_name"
            disabled
            value={profile.firstName}
          />
        </div>
        <div className="flex-1">
          <label className="mb-2 block font-semibold" htmlFor="last_name">Nom</label>
          <Input
            type="text"
            id="last_name"
            disabled
            value={profile.lastName}
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
            value={profile.email}
          />
        </div>
        <div>
          <Button as="a" href={`${import.meta.env.VITE_OIDC_PROVIDER_URL}/account`}>Modifier ces informations</Button>
        </div>
      </div>
      <div className="mb-6">
        <label className="mb-2 block font-semibold" htmlFor="instrument">Instrument</label>
        <Select
          id="instrument"
          {...register('instrumentId')}
        >
          {instruments ? instruments.map((instrument) => (
            <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
          )) : null}
        </Select>
      </div>
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
