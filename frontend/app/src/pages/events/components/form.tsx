import type { Event, EventCreate } from 'bagad-client';
import { Controller, type SubmitHandler, useForm } from 'react-hook-form';
import costume from '../../../assets/costume.svg';
import polo from '../../../assets/polo.svg';
import tshirt from '../../../assets/tshirt.svg';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { fromIsoDate, toIsoDate } from '../../../utils/date';

interface EventFormProps {
  onSubmit: SubmitHandler<EventCreate>;
  data?: Event;
}

const categoryOptions = [
  { value: 'sortie', id: 'category-outing', label: 'Sortie', description: 'Concert, défilé ou autre prestation.' },
  { value: 'repetition', id: 'category-rehearsal', label: 'Répétition', description: 'Répétition de l’ensemble.' },
  { value: 'autre', id: 'category-other', label: 'Autre évènement', description: 'Réunion ou activité hors prestation.' },
] as const;

const costumeOptions = [
  { value: 'COSTUME', id: 'costume-costume', image: costume, label: 'Costume' },
  { value: 'POLO', id: 'costume-polo', image: polo, label: 'Polo' },
  { value: 'NONE', id: 'costume-none', image: tshirt, label: 'Aucune tenue définie' },
] as const;

export default function EventForm({ onSubmit, data = undefined }: EventFormProps) {
  const {
    register, control, handleSubmit, formState: { errors, dirtyFields, isSubmitting }, setValue,
  } = useForm<EventCreate>({ defaultValues: data || { category: 'sortie', isInDoodle: true, costume: 'COSTUME' } });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <Field data-invalid={!!errors.title}>
          <FieldLabel htmlFor="title">Titre</FieldLabel>
          <Input
            id="title"
            type="text"
            aria-invalid={!!errors.title}
            {...register('title', { required: 'Ce champ est obligatoire.', maxLength: { value: 100, message: 'Titre trop long.' } })}
          />
          <FieldError>{errors.title?.message}</FieldError>
        </Field>

        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Input
            id="description"
            type="text"
            aria-invalid={!!errors.description}
            {...register('description', { required: 'Ce champ est obligatoire.' })}
          />
          <FieldError>{errors.description?.message}</FieldError>
        </Field>

        <Field data-invalid={!!errors.date}>
          <FieldLabel htmlFor="date">Date</FieldLabel>
          <Controller
            name="date"
            control={control}
            rules={{ required: 'Ce champ est obligatoire.' }}
            defaultValue={new Date()}
            render={({ field }) => (
              <Input
                id="date"
                type="date"
                aria-invalid={!!errors.date}
                value={toIsoDate(field.value)}
                onChange={(event) => {
                  if (event.target.value) field.onChange(fromIsoDate(event.target.value));
                }}
              />
            )}
          />
          <FieldError>{errors.date?.message}</FieldError>
        </Field>

        <Controller
          name="category"
          control={control}
          rules={{ required: 'Ce champ est obligatoire.' }}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend>Catégorie</FieldLegend>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  if (!dirtyFields.isInDoodle) setValue('isInDoodle', value === 'sortie');
                  if (!dirtyFields.costume) setValue('costume', value === 'sortie' ? 'COSTUME' : 'POLO');
                }}
                className="grid gap-3 md:grid-cols-3"
              >
                {categoryOptions.map((option) => (
                  <FieldLabel
                    key={option.value}
                    htmlFor={option.id}
                    className="cursor-pointer rounded-2xl border p-4 hover:bg-muted has-data-checked:border-primary has-data-checked:bg-primary/5"
                  >
                    <Field orientation="horizontal" data-invalid={!!errors.category}>
                      <RadioGroupItem
                        id={option.id}
                        value={option.value}
                        aria-invalid={!!errors.category}
                      />
                      <FieldContent>
                        <FieldTitle>{option.label}</FieldTitle>
                        <FieldDescription>{option.description}</FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
              <FieldError>{errors.category?.message}</FieldError>
            </FieldSet>
          )}
        />

        <Controller
          name="costume"
          control={control}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend>Costume</FieldLegend>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-4 md:grid-cols-3">
                {costumeOptions.map((option) => (
                  <FieldLabel
                    key={option.value}
                    htmlFor={option.id}
                    className="cursor-pointer text-center hover:bg-muted has-data-checked:border-primary has-data-checked:bg-primary/5"
                  >
                    <Field orientation="horizontal" className="items-center">
                      <RadioGroupItem id={option.id} value={option.value} />
                      <FieldContent className="items-center text-center">
                        <img className="h-16 md:h-32" src={option.image} alt="" />
                        <FieldTitle>{option.label}</FieldTitle>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                ))}
              </RadioGroup>
            </FieldSet>
          )}
        />

        <Controller
          name="isInDoodle"
          control={control}
          render={({ field }) => (
            <Field orientation="horizontal" className={cn('rounded-2xl border p-4 hover:bg-muted', field.value && 'border-primary bg-primary/5')}>
              <Checkbox
                id="is_in_doodle"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
              <FieldContent>
                <FieldLabel htmlFor="is_in_doodle">Afficher dans le sondage</FieldLabel>
                <FieldDescription>
                  Cet évènement apparaîtra dans le sondage, et tous les membres recevront un email lors de la création de l&apos;évènement.
                </FieldDescription>
              </FieldContent>
            </Field>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Enregistrer
        </Button>
      </FieldGroup>
    </form>
  );
}
