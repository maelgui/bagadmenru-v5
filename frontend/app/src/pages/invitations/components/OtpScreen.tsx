import { ArrowLeft, MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FieldDescription } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';

const OTP_LENGTH = 6;

/**
 * Dedicated verification screen shown after the code has been sent.
 *
 * A separate step (not an inline field) keeps the focus on entering the code.
 * The account is created once a valid 6-digit code is submitted.
 */
export default function OtpScreen({
  email,
  submitting,
  onSubmit,
  onResend,
  onBack,
  resending,
}: {
  email: string;
  submitting: boolean;
  onSubmit: (code: string) => void;
  onResend: () => void;
  onBack: () => void;
  resending: boolean;
}) {
  const [code, setCode] = useState('');
  // autoFocus only on non-touch (desktop): on mobile it can pop the keyboard
  // and jump the scroll before the user has read the screen.
  const autoFocusOtp = typeof window !== 'undefined'
    && window.matchMedia('(pointer: fine)').matches;

  return (
    <div>
      <button
        type="button"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Retour
      </button>

      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck aria-hidden="true" />
        </div>
        <h1 className="mb-1 text-2xl">Vérifiez votre email</h1>
        <p className="text-muted-foreground">
          Entrez le code à 6 chiffres envoyé à
        </p>
        <p className="font-medium">{email}</p>
        <button
          type="button"
          className="mt-1 text-sm text-muted-foreground underline hover:text-primary"
          onClick={onBack}
        >
          Ce n&apos;est pas votre email ? Modifier
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(code);
        }}
        className="flex flex-col items-center gap-6"
      >
        <InputOTP
          maxLength={OTP_LENGTH}
          value={code}
          onChange={setCode}
          // Submit automatically once all digits are entered.
          onComplete={onSubmit}
          autoFocus={autoFocusOtp}
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <Button
          type="submit"
          className="w-full"
          disabled={submitting || code.length < OTP_LENGTH}
        >
          {submitting && <Spinner data-icon="inline-start" />}
          Créer mon compte
        </Button>

        <FieldDescription className="text-center">
          Vous n&apos;avez rien reçu ?
          {' '}
          <button
            type="button"
            className="underline hover:text-primary"
            onClick={onResend}
            disabled={resending}
          >
            Renvoyer un code
          </button>
        </FieldDescription>
      </form>
    </div>
  );
}
