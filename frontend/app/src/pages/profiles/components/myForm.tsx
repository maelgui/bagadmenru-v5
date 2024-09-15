/* eslint-disable react/jsx-props-no-spreading */
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { MyProfileUpdate, Profile } from 'bagad-client';
import { useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import Avatar from '../../../components/avatar';
import Button from '../../../components/button';
import { queryClient, useApiClient } from '../../../config/client';
import BaseProfileFormFields from './base';

type AvatarInputProps = {
  defaultUrl: string | null;
  profileId: string;
  onChange: (value: string | null) => void;
};
function AvatarInput({
  defaultUrl, profileId, onChange,
}: AvatarInputProps) {
  const { usersApi } = useApiClient();

  const [pictureUrl, setPictureUrl] = useState<string | null>(defaultUrl);

  const onUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // API call to generate a pre-signed url to upload file object
    Array.from(event.target.files ?? [])?.map(async (file) => {
      const presignedUploadUrl = await usersApi.uploadAvatarApiV1ProfilesMeAvatarPost();
      await axios.put(
        presignedUploadUrl.url,
        file,
        {
          headers: {
            'X-Amz-Tagging': new URLSearchParams({ user_id: profileId, temp: 'true' }).toString(),
          },
        },
      );
      setPictureUrl(URL.createObjectURL(file));
      onChange(presignedUploadUrl.key);
    });
  };

  return (
    <>
      <Avatar src={pictureUrl} size="lg" />
      <label
        htmlFor="pictureFileInput"
        className="cursor-pointer m-4 absolute right-0 bottom-0 rounded-full bg-white h-12 w-12 flex justify-center items-center shadow-lg"
        aria-label="Changer mon avatar"
      >
        <FontAwesomeIcon icon={faEdit} />
      </label>
      <input
        type="file"
        id="pictureFileInput"
        accept="image/*"
        onChange={onUploadAvatar}
        className="hidden"
      />
    </>
  );
}

export default function EditProfileForm({ profile = undefined }: { profile?: Profile }) {
  const { usersApi } = useApiClient();

  const methods = useForm<MyProfileUpdate>({ defaultValues: profile });
  const { register, formState: { errors } } = methods;
  const { mutate } = useMutation({
    mutationFn: (data: MyProfileUpdate) => usersApi.updateMyProfileApiV1ProfilesMePut({
      myProfileUpdate: data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles', 'me'] });
      toast.success('Profile modifié avec succès !');
    },
  });
  const onSubmit = (data: MyProfileUpdate) => mutate(data);

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)}>
      <FormProvider {...methods}>
        <BaseProfileFormFields profile={profile} />
      </FormProvider>
      <Button type="submit">Enregistrer</Button>
    </form>
  );
}
