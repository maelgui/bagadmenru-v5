import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';

interface PasswordFieldProps {
  id: string;
  label: string;
  error?: string;
  registration: UseFormRegisterReturn;
  autoComplete?: string;
}

export default function PasswordField({
  id, label, error, registration, autoComplete,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          type={show ? 'text' : 'password'}
          id={id}
          aria-invalid={!!error}
          autoComplete={autoComplete}
          {...registration}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton onClick={() => setShow((visible) => !visible)} aria-label={show ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}>
            {show ? <EyeOff /> : <Eye />}
            {show ? 'Cacher' : 'Afficher'}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
