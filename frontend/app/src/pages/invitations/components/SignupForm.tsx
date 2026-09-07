import type { InvitationInfo, PublicInstrument } from 'bagad-client';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Field, FieldDescription, FieldError, FieldGroup, FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';
import type { SignupFormValues } from '../types';

/**
 * Profile form step: collects the member's details before verification.
 *
 * Only the email may be prefilled (from an emailed invitation); the member
 * fills in the rest. The email is read-only when the invitation proved it.
 */
export default function SignupForm({
  info,
  instruments,
  submitting,
  onSubmit,
}: {
  info: InvitationInfo;
  instruments: PublicInstrument[] | undefined;
  submitting: boolean;
  onSubmit: (values: SignupFormValues) => void;
}) {
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<SignupFormValues>({
    // Prefill the (possibly proven) email via RHF `values`. The invitation
    // query is cached with staleTime: Infinity and no focus refetch, so `info`
    // is a stable reference and this never re-resets the form under the user.
    values: {
      firstName: '',
      lastName: '',
      email: info.email ?? '',
      instrumentId: '',
    },
  });

  // The instrument list has loaded and is empty: the required instrument field
  // can't be satisfied, so guide the user instead of leaving a dead-end select.
  const noInstruments = instruments?.length === 0;

  return (
    <div>
      <h1 className="mb-2 text-2xl">Rejoindre le Bagad Men Ru</h1>
      <p className="mb-8 text-muted-foreground">Complétez votre inscription</p>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="mb-6">
          <Field data-invalid={!!errors.firstName}>
            <FieldLabel htmlFor="firstName">Prénom</FieldLabel>
            <Input
              id="firstName"
              autoComplete="given-name"
              aria-invalid={!!errors.firstName}
              {...register('firstName', { required: 'Ce champ est obligatoire.' })}
            />
            <FieldError>{errors.firstName?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.lastName}>
            <FieldLabel htmlFor="lastName">Nom</FieldLabel>
            <Input
              id="lastName"
              autoComplete="family-name"
              aria-invalid={!!errors.lastName}
              {...register('lastName', { required: 'Ce champ est obligatoire.' })}
            />
            <FieldError>{errors.lastName?.message}</FieldError>
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              type="email"
              id="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              readOnly={!!info.emailLocked}
              aria-invalid={!!errors.email}
              {...register('email', { required: 'Ce champ est obligatoire.' })}
            />
            <FieldError>{errors.email?.message}</FieldError>
            {!info.emailLocked ? (
              <FieldDescription>
                Nous vous enverrons un code à cette adresse pour la vérifier
                avant de créer votre compte.
              </FieldDescription>
            ) : null}
          </Field>

          <Field data-invalid={!!errors.instrumentId}>
            <FieldLabel htmlFor="instrumentId">Instrument</FieldLabel>
            <NativeSelect
              id="instrumentId"
              aria-invalid={!!errors.instrumentId}
              disabled={noInstruments}
              {...register('instrumentId', { required: 'Ce champ est obligatoire.' })}
            >
              <option value="">Sélectionner un instrument</option>
              {(instruments ?? []).map((instrument) => (
                <option key={instrument.id} value={instrument.id}>{instrument.name}</option>
              ))}
            </NativeSelect>
            <FieldError>{errors.instrumentId?.message}</FieldError>
            {noInstruments ? (
              <FieldDescription>
                Aucun instrument n&apos;est disponible pour le moment. Contactez la
                personne qui vous a invité·e pour finaliser votre inscription.
              </FieldDescription>
            ) : null}
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={submitting || noInstruments}>
          {submitting && <Spinner data-icon="inline-start" />}
          Continuer
        </Button>
      </form>
    </div>
  );
}
