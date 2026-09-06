import { useQuery } from '@tanstack/react-query';
import type { GroupCreate } from 'bagad-client';
import { useEffect } from 'react';
import { Controller, type SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { useApiClient } from '../../../config/client';

interface PermissionsFormProps {
  onSubmit: SubmitHandler<GroupCreate>
  data?: GroupCreate
}

export default function PermissionsForm({ onSubmit, data = undefined }: PermissionsFormProps) {
  const { usersApi } = useApiClient();
  const rolesAnchor = useComboboxAnchor();
  const {
    register, handleSubmit, setValue, formState: { errors }, control,
  } = useForm<GroupCreate & { mailingListEnabled: boolean }>({
    defaultValues: {
      mailingListEnabled: !!data?.mailingList,
      ...(data || { color: '#932a58', roleIds: [] }),
    },
  });
  const watchName = useWatch({ control, name: 'name', defaultValue: 'groupe' });
  const watchColor = useWatch({ control, name: 'color', defaultValue: '' });
  const watchMailingListEnabled = useWatch({ control, name: 'mailingListEnabled' });

  useEffect(() => {
    if (!watchMailingListEnabled) {
      setValue('mailingList', null);
    }
  }, [setValue, watchMailingListEnabled]);

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => await usersApi.listRolesApiV1RolesGet(),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="name">Nom</FieldLabel>
          <Input
            type="text"
            id="name"
            aria-invalid={!!errors.name}
            {...register('name', { required: 'Ce champ est obligatoire.' })}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </Field>

        <Field data-invalid={!!errors.color}>
          <FieldLabel htmlFor="color">Couleur</FieldLabel>
          <input type="color" id="color" className="sr-only" {...register('color', { required: 'Ce champ est obligatoire.' })} />
          {!watchName ? (
            <FieldDescription>Choisissez d&apos;abord un nom de groupe.</FieldDescription>
          ) : (
            <Badge render={<label htmlFor="color" aria-label="Choisir la couleur du groupe" />} style={{ backgroundColor: watchColor }} className="cursor-pointer text-lg">
              {watchName}
            </Badge>
          )}
          <FieldError>{errors.color?.message}</FieldError>
        </Field>

        <Field data-invalid={!!errors.roleIds}>
          <FieldLabel htmlFor="roleIds">Permissions</FieldLabel>
          <Controller
            name="roleIds"
            control={control}
            render={({ field: { onChange, value } }) => (
              <Combobox
                multiple
                value={value}
                onValueChange={(selected) => onChange(Array.isArray(selected) ? selected : [])}
              >
                <ComboboxChips ref={rolesAnchor}>
                  <ComboboxValue>
                    {(values: string[]) => (
                      <>
                        {values.map((roleId) => (
                          <ComboboxChip key={roleId} aria-label={roleId}>
                            {roleId}
                          </ComboboxChip>
                        ))}
                        <ComboboxChipsInput id="roleIds" placeholder={values.length ? '' : 'Sélectionnez des permissions'} />
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={rolesAnchor}>
                  <ComboboxList>
                    {roles?.map((role) => (
                      <ComboboxItem key={role.id} value={role.id}>
                        <span className="flex flex-col gap-1">
                          <span>{role.id}</span>
                          <span className="text-xs font-normal text-muted-foreground">{role.description}</span>
                        </span>
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                  <ComboboxEmpty>Aucune permission trouvée.</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>
            )}
          />
          <FieldError>{errors.roleIds?.message}</FieldError>
        </Field>

        <Controller
          name="mailingListEnabled"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field
              orientation="horizontal"
              className="rounded-2xl border-2 p-4 transition-colors hover:bg-muted data-[checked=true]:border-primary"
              data-checked={value}
            >
              <Checkbox id="mailingListEnabled" checked={value} onCheckedChange={onChange} />
              <FieldContent>
                <FieldLabel htmlFor="mailingListEnabled" className="cursor-pointer">Associer une mailing liste</FieldLabel>
                <FieldDescription>Les utilisateurs de ce groupe seront tous ajoutés à une mailing list</FieldDescription>
              </FieldContent>
            </Field>
          )}
        />

        {watchMailingListEnabled ? (
          <Field data-invalid={!!errors.mailingList}>
            <FieldLabel htmlFor="mailingList">Mailing liste</FieldLabel>
            <InputGroup>
              <InputGroupInput
                type="text"
                id="mailingList"
                aria-invalid={!!errors.mailingList}
                {...register('mailingList', { required: 'Ce champ est obligatoire.' })}
              />
              <InputGroupAddon align="inline-end"><InputGroupText>@bagadmenru.bzh</InputGroupText></InputGroupAddon>
            </InputGroup>
            <FieldError>{errors.mailingList?.message}</FieldError>
          </Field>
        ) : null}

        <Controller
          name="isInstrument"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field
              orientation="horizontal"
              className="rounded-2xl border-2 p-4 transition-colors hover:bg-muted data-[checked=true]:border-primary"
              data-checked={!!value}
            >
              <Checkbox id="isInstrument" checked={!!value} onCheckedChange={onChange} />
              <FieldContent>
                <FieldLabel htmlFor="isInstrument" className="cursor-pointer">Pupitre d&apos;instrument</FieldLabel>
                <FieldDescription>Ce groupe représente un instrument (bombarde, cornemuse, percussions…) et sera proposé à l&apos;inscription des membres.</FieldDescription>
              </FieldContent>
            </Field>
          )}
        />

        <Button type="submit">Enregistrer</Button>
      </FieldGroup>
    </form>
  );
}
