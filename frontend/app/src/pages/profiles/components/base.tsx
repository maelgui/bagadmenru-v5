/* eslint-disable react/jsx-props-no-spreading */
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import { Profile, ProfileUpdate } from 'bagad-client';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import Avatar from '../../../components/avatar';
import Input from '../../../components/input';
import { useApiClient } from '../../../config/client';

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

export default function BaseProfileFormFields({ profile = undefined, avatar = true }: { profile?: Profile, avatar: boolean }) {
  const {
    register, control, formState: { errors },
  } = useFormContext<ProfileUpdate>();

  return (
    <div>
      {profile && avatar ? (
        <div className="text-center mb-6">
          <div className="inline-block m-auto relative my-8">
            <Controller
              name="pictureKey"
              control={control}
              render={({ field: { onChange } }) => (
                <AvatarInput
                  defaultUrl={profile?.pictureUrl}
                  profileId={profile?.id}
                  onChange={onChange}
                />
              )}
            />
          </div>
        </div>
      )
        : null}

      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <label className="mb-2 block font-semibold" htmlFor="first_name">Prénom</label>
          <Input
            type="text"
            id="first_name"
            error={errors.firstName?.message}
            {...register('firstName', { required: 'Ce champ est obligatoire.' })}

          />
        </div>
        <div className="flex-1">
          <label className="mb-2 block font-semibold" htmlFor="last_name">Nom</label>
          <Input
            type="text"
            id="last_name"
            error={errors.lastName?.message}
            {...register('lastName', { required: 'Ce champ est obligatoire.' })}
          />
        </div>
      </div>
    </div>
  );
}
