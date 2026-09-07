import { useMutation } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Field, FieldError, FieldGroup, FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { useApiClient } from '../../../config/client';
import { extractErrorMessage } from '../errors';

interface EmailFormValues {
  email: string;
  firstName: string;
}

/**
 * Secondary invite path: send the invitation by email. Collapsed by default so
 * the QR/link stays the primary action. The first name is optional and only
 * personalises the email.
 */
export default function EmailInviteForm() {
  const { invitationsApi } = useApiClient();
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm<EmailFormValues>();

  const sendEmail = useMutation({
    mutationFn: async (values: EmailFormValues) => await invitationsApi.createInvitationApiV1InvitationsPost({
      invitationCreate: {
        channel: 'email',
        email: values.email,
        firstName: values.firstName || undefined,
      },
    }),
    onSuccess: () => {
      toast.add({ title: 'Invitation envoyée par email !', type: 'success' });
      reset();
      setOpen(false);
    },
    onError: async (error) => {
      toast.add({ title: await extractErrorMessage(error, 'Impossible d\'envoyer l\'invitation.'), type: 'error' });
    },
  });

  return (
    <div className="mt-6">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm font-medium hover:text-primary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="email-invite-panel"
      >
        Vous préférez l&apos;inviter par email ?
        <ChevronDown
          aria-hidden="true"
          className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <form id="email-invite-panel" className="mt-2" onSubmit={handleSubmit((values) => sendEmail.mutate(values))}>
          <FieldGroup className="mb-4">
            <Field>
              <FieldLabel htmlFor="firstName">Prénom (facultatif)</FieldLabel>
              <Input id="firstName" autoComplete="given-name" {...register('firstName')} />
              <FieldError />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                type="email"
                id="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="prenom@exemple.fr"
                {...register('email', { required: true })}
              />
              <FieldError />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={sendEmail.isPending}>
            {sendEmail.isPending && <Spinner data-icon="inline-start" />}
            Envoyer l&apos;invitation
          </Button>
        </form>
      ) : null}
    </div>
  );
}
