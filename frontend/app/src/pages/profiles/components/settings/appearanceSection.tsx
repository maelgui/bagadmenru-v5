import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldLabel,
} from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTheme } from '../../../../config/theme';

interface ThemeOption {
  value: 'light' | 'dark' | 'system';
  label: string;
  icon: LucideIcon;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Clair', icon: SunIcon },
  { value: 'dark', label: 'Sombre', icon: MoonIcon },
  { value: 'system', label: 'Système', icon: MonitorIcon },
];

/**
 * "Apparence" section: theme (light/dark/system, fully functional) and
 * language. Language is UI-only for now - Brezhoneg is shown but disabled
 * until the i18n infrastructure lands (see TODO below).
 */
export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apparence</CardTitle>
        <CardDescription>
          Personnalisez l’affichage de l’application.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Field>
          <FieldLabel htmlFor="theme">Thème</FieldLabel>
          <RadioGroup
            id="theme"
            value={theme}
            onValueChange={(value) => {
              const next = String(value);
              if (next === 'light' || next === 'dark' || next === 'system') {
                setTheme(next);
              }
            }}
            className="grid-cols-3 gap-3 sm:max-w-md"
            aria-label="Thème"
          >
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <label
                key={value}
                htmlFor={`theme-${value}`}
                className={cn(
                  'flex cursor-pointer flex-col items-center gap-2 rounded-2xl border p-4 text-sm transition-colors',
                  'hover:bg-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
                  theme === value ? 'border-primary bg-muted' : 'border-border',
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="font-medium">{label}</span>
                <RadioGroupItem value={value} id={`theme-${value}`} className="sr-only" />
              </label>
            ))}
          </RadioGroup>
          <FieldDescription>
            « Système » suit le réglage clair/sombre de votre appareil.
          </FieldDescription>
        </Field>

        <Separator />

        <Field>
          <FieldLabel htmlFor="language">Langue</FieldLabel>
          {/*
            TODO(i18n): the language selector is not wired yet. It requires an
            i18n library (e.g. react-i18next), string extraction across the app
            and the Breton translation itself. Until then Français is the only
            selectable option and Brezhoneg is disabled.
          */}
          <NativeSelect id="language" value="fr" disabled className="w-full sm:w-64">
            <NativeSelectOption value="fr">Français</NativeSelectOption>
            <NativeSelectOption value="br" disabled>
              Brezhoneg (bientôt disponible)
            </NativeSelectOption>
          </NativeSelect>
          <FieldDescription>
            La traduction en breton sera bientôt disponible.
          </FieldDescription>
        </Field>
      </CardContent>
    </Card>
  );
}
