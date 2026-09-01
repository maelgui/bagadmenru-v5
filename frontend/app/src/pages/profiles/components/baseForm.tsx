import { MailIcon, MailXIcon, Pencil } from 'lucide-react';
import type { Profile, ProfileUpdate } from 'bagad-client';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/toast';
import { useApiClient } from '../../../config/client';

interface AvatarInputProps {
  defaultUrl: string | null;
  profileId: string;
  onChange: (value: string | null) => void;
}
function AvatarInput({
  defaultUrl, profileId, onChange,
}: AvatarInputProps) {
  const { usersApi } = useApiClient();

  const [pictureUrl, setPictureUrl] = useState<string | null>(defaultUrl);

  const uploadAvatar = async (file: File) => {
    // API call to generate a pre-signed url to upload file object
    const presignedUploadUrl = await usersApi.uploadAvatarApiV1ProfilesMeAvatarPost();
    const response = await fetch(presignedUploadUrl.url, {
      method: 'PUT',
      body: file,
      headers: {
        'X-Amz-Tagging': new URLSearchParams({ user_id: profileId, temp: 'true' }).toString(),
      },
    });
    if (!response.ok) {
      throw new Error(`Avatar upload failed with status ${response.status}`);
    }
    setPictureUrl(URL.createObjectURL(file));
    onChange(presignedUploadUrl.key);
  };

  const onAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length === 1) {
      void toast.promise(
        uploadAvatar(event.target.files[0]),
        {
          loading: 'Envoi...',
          success: 'Fichier téléchargé !',
          error: 'Erreur.',
        },
      );
    }
  };

  return (
    <>
      <Avatar className="size-64">
        <AvatarImage src={pictureUrl ?? undefined} alt="Avatar du profil" />
        <AvatarFallback>Profil</AvatarFallback>
      </Avatar>
      <label
        htmlFor="pictureFileInput"
        className="absolute right-0 bottom-0 m-4 flex size-12 cursor-pointer items-center justify-center rounded-full bg-card shadow-lg"
        aria-label="Changer mon avatar"
      >
        <Pencil aria-hidden="true" />
      </label>
      <input
        type="file"
        id="pictureFileInput"
        accept="image/*"
        onChange={onAvatarChange}
        className="hidden"
      />
    </>
  );
}

export default function BaseProfileFormFields(
  { profile = undefined, avatar = true }: { profile?: Profile, avatar?: boolean },
) {
  const {
    register, control, formState: { errors },
  } = useFormContext<ProfileUpdate>();

  return (
    <div>
      {profile && avatar ? (
        <div className="mb-6 text-center">
          <div className="relative my-8 inline-block">
            <Controller
              name="pictureKey"
              control={control}
              render={({ field: { onChange } }) => (
                <AvatarInput
                  defaultUrl={profile.pictureUrl}
                  profileId={profile.id}
                  onChange={onChange}
                />
              )}
            />
          </div>
        </div>
      )
        : null}

      <FieldGroup className="mb-6">
        <Controller
          name="receivesEmails"
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch
                id="receivesEmails"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldContent>
                <FieldLabel htmlFor="receivesEmails">
                  {field.value ? <MailIcon aria-hidden="true" /> : <MailXIcon aria-hidden="true" />}
                  Notifications par email
                </FieldLabel>
                <FieldDescription>
                  Recevoir les emails du groupe (événements, annonces...).
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />
      </FieldGroup>

      <FieldGroup className="mb-6 md:grid md:grid-cols-2 md:gap-4">
        <Field data-invalid={!!errors.firstName}>
          <FieldLabel htmlFor="first_name">Prénom</FieldLabel>
          <Input
            type="text"
            id="first_name"
            aria-invalid={!!errors.firstName}
            {...register('firstName', { required: 'Ce champ est obligatoire.' })}
          />
          <FieldError>{errors.firstName?.message}</FieldError>
        </Field>
        <Field data-invalid={!!errors.lastName}>
          <FieldLabel htmlFor="last_name">Nom</FieldLabel>
          <Input
            type="text"
            id="last_name"
            aria-invalid={!!errors.lastName}
            {...register('lastName', { required: 'Ce champ est obligatoire.' })}
          />
          <FieldError>{errors.lastName?.message}</FieldError>
        </Field>
      </FieldGroup>
    </div>
  );
}
