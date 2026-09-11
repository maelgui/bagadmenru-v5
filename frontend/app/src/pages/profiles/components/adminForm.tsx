import { useQuery } from '@tanstack/react-query';
import type { Group, Profile, ProfileCreate, ProfileUpdate, PublicInstrument } from 'bagad-client';
import {
  Controller, FormProvider, type SubmitHandler, useForm,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useApiClient } from '../../../config/client';
import BaseProfileFormFields from './baseForm';

interface ProfileFormData extends ProfileUpdate, ProfileCreate { }

interface AdminProfileForm {
  profile?: Profile
  onSubmit: SubmitHandler<ProfileFormData>
}

export default function AdminEditProfileForm(
  { profile = undefined, onSubmit }: AdminProfileForm,
) {
  const { usersApi, instrumentsApi } = useApiClient();
  const groupsAnchor = useComboboxAnchor();

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => await usersApi.listGroupsApiV1GroupsGet(),
  });

  // Instruments come from the dedicated public endpoint (only is_instrument
  // groups), so the instrument picker no longer offers non-instrument groups.
  const { data: instruments } = useQuery({
    queryKey: ['instruments'],
    queryFn: async () => await instrumentsApi.listInstrumentsApiV1InstrumentsGet(),
  });

  const methods = useForm<ProfileFormData>({
    defaultValues: profile ? {
      firstName: profile.firstName,
      lastName: profile.lastName,
      groupIds: profile.groups.map((group) => group.id),
      instrumentId: profile.instrument?.id,
      receivesEmails: profile.receivesEmails,
      // Push is user- and device-controlled; admins don't manage it here, so
      // just carry the member's existing preference through unchanged.
      receivesPush: profile.receivesPush,
    } : {
      // New members default to receiving push (matches the DB default).
      receivesPush: true,
    },
  });

  const {
    handleSubmit, control, register, formState: { errors, isSubmitting },
  } = methods;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormProvider {...methods}>
        <BaseProfileFormFields profile={profile} avatar={false} />
      </FormProvider>
      {!profile ? (
        <Field data-invalid={!!errors.email} className="mb-6">
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input
            type="email"
            id="email"
            aria-invalid={!!errors.email}
            {...register('email', { required: 'Ce champ est obligatoire.' })}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </Field>
      ) : null}

      <FieldGroup className="mb-6">
        <Field data-invalid={!!errors.instrumentId}>
          <FieldLabel htmlFor="instrumentId">Instrument</FieldLabel>
          <Controller
            name="instrumentId"
            control={control}
            render={({ field }) => (
              <Combobox
                items={instruments ?? []}
                itemToStringLabel={(group: PublicInstrument) => group.name}
                value={instruments?.find((group) => group.id === field.value) ?? null}
                onValueChange={(group: PublicInstrument | null) => field.onChange(group ? group.id : undefined)}
              >
                <ComboboxInput id="instrumentId" placeholder="Sélectionner un instrument" showClear />
                <ComboboxContent>
                  <ComboboxList>
                    {(group: PublicInstrument) => (
                      <ComboboxItem key={group.id} value={group}>
                        {group.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
          <FieldError>{errors.instrumentId?.message}</FieldError>
        </Field>
        <Field data-invalid={!!errors.groupIds}>          <FieldLabel htmlFor="groupIds">Groupes</FieldLabel>
          <Controller
            name="groupIds"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <Combobox
                multiple
                items={groups ?? []}
                itemToStringLabel={(group: Group) => group.name}
                isItemEqualToValue={(a: Group, b: Group) => a.id === b.id}
                value={groups?.filter((group) => field.value.includes(group.id)) ?? []}
                onValueChange={(selected: Group[]) => field.onChange(selected.map((group) => group.id))}
              >
                <ComboboxChips ref={groupsAnchor}>
                  <ComboboxValue>
                    {(values: Group[]) => (
                      <>
                        {values.map((group) => (
                          <ComboboxChip key={group.id} aria-label={group.name}>
                            {group.name}
                          </ComboboxChip>
                        ))}
                        <ComboboxChipsInput id="groupIds" placeholder={values.length ? '' : 'Sélectionner des groupes'} />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={groupsAnchor}>
                  <ComboboxList>
                    {(group: Group) => (
                      <ComboboxItem key={group.id} value={group}>
                        {group.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            )}
          />
          <FieldError>{errors.groupIds?.message}</FieldError>
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner data-icon="inline-start" />}
        Enregistrer
      </Button>
    </form>
  );
}
