import { useMutation, useQuery } from '@tanstack/react-query';
import type { InvitationAccept, InvitationInfo, PublicInstrument } from 'bagad-client';
import { Link, useParams } from 'react-router-dom';
import { useRef, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { queryClient, useApiClient } from '../../config/client';
import InvalidInvitationAlert from './components/InvalidInvitationAlert';
import OtpScreen from './components/OtpScreen';
import PasskeyEnrollment from './PasskeyEnrollment';
import SignupForm from './components/SignupForm';
import { extractErrorMessage } from './errors';
import type { SignupFormValues } from './types';
import { cn } from '@/lib/utils';

// The signup is a short, strictly sequential flow (form → OTP → passkey →
// done) whose intermediate state (submitted values, OTP) lives only in memory
// and is not deep-linkable. A local step state machine models this better than
// URL routes, which would imply shareable/back-navigable steps we can't honour.
type Step = 'form' | 'otp' | 'passkey' | 'done';

/**
 * Public self-service signup, reached from an invitation link/QR.
 *
 * Orchestrates the steps: profile form → (if the email is not proven) a
 * dedicated OTP screen → account creation → passkey enrolment. When the
 * invitation email was backend-proven and left unchanged, the OTP step is
 * skipped entirely.
 */
export default function InvitePage() {
  const { invitationsApi, instrumentsApi } = useApiClient();
  const { token } = useParams<'token'>();
  const safeToken = token ?? '';

  const {
    data: info,
    isPending,
    isError,
  } = useQuery<InvitationInfo>({
    queryKey: ['invitation', token],
    queryFn: async () => await invitationsApi.getInvitationApiV1InvitationsTokenGet({ token: safeToken }),
    retry: false,
    enabled: !!token,
    // Static for the duration of the signup. Don't refetch on window focus: a
    // refetch returns a fresh object reference that would re-run the prefill
    // effect and reset the form mid-signup.
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const { data: instruments } = useQuery<PublicInstrument[]>({
    queryKey: ['instruments'],
    queryFn: async () => await instrumentsApi.listInstrumentsApiV1InstrumentsGet(),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const [step, setStep] = useState<Step>('form');
  // The submitted email, needed by the OTP screen and to build the accept
  // payload after the form step has unmounted.
  const [pendingEmail, setPendingEmail] = useState('');
  const pendingValues = useRef<SignupFormValues | null>(null);

  const buildPayload = (
    values: SignupFormValues,
    code?: string,
  ): InvitationAccept => ({
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    instrumentId: Number(values.instrumentId),
    code,
  });

  const requestOtp = useMutation({
    mutationFn: async (email: string) => await invitationsApi.requestOtpApiV1InvitationsTokenOtpPost({
      token: safeToken,
      otpRequest: { email },
    }),
    onSuccess: () => setStep('otp'),
    onError: async (error) => {
      toast.add({ title: await extractErrorMessage(error, 'Impossible d\'envoyer le code.'), type: 'error' });
    },
  });

  const accept = useMutation({
    mutationFn: async (code: string | undefined) => {
      const values = pendingValues.current;
      // Only reachable after onSubmit captured the form values.
      if (!values) throw new Error('No submitted values to accept the invitation.');
      return await invitationsApi.acceptInvitationApiV1InvitationsTokenAcceptPost({
        token: safeToken,
        invitationAccept: buildPayload(values, code),
      });
    },
    onSuccess: async () => {
      // accept() signed the new member in (additive session cookie, now the
      // active account). Refresh cached auth/session state so the app acts as
      // the new member for the passkey enrolment that follows.
      await queryClient.invalidateQueries();
      setStep('passkey');
    },
    onError: async (error) => {
      toast.add({ title: await extractErrorMessage(error, 'Une erreur est survenue.'), type: 'error' });
    },
  });

  if (!token) return <InvalidInvitationAlert />;
  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (isError) return <InvalidInvitationAlert />;

  if (step === 'done') {
    return (
      <div className="text-center">
        <h1 className="mb-2 text-2xl">Bienvenue !</h1>
        <p className="mb-6 text-muted-foreground">
          Votre compte est prêt. Vous pouvez dès maintenant accéder à votre
          espace.
        </p>
        <Link to="/" className={cn(buttonVariants())}>Accéder à mon espace</Link>
      </div>
    );
  }

  if (step === 'passkey') {
    return <PasskeyEnrollment onEnrolled={() => setStep('done')} />;
  }

  if (step === 'otp') {
    return (
      <OtpScreen
        email={pendingEmail}
        submitting={accept.isPending}
        resending={requestOtp.isPending}
        onSubmit={(code) => accept.mutate(code)}
        onResend={() => requestOtp.mutate(pendingEmail)}
        onBack={() => setStep('form')}
      />
    );
  }

  const onSubmit = (values: SignupFormValues) => {
    pendingValues.current = values;
    setPendingEmail(values.email);
    // Email proven (locked and unchanged) -> create the account directly.
    const emailProven = !!info.emailLocked && values.email === info.email;
    if (emailProven) {
      accept.mutate(undefined);
    } else {
      // Otherwise send a code and move to the dedicated verification screen.
      requestOtp.mutate(values.email);
    }
  };

  return (
    <SignupForm
      info={info}
      instruments={instruments}
      submitting={requestOtp.isPending || accept.isPending}
      onSubmit={onSubmit}
    />
  );
}
