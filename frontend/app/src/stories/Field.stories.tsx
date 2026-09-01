import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const meta = {
  title: 'Components/Field',
  component: Field,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field className="w-80">
      <FieldLabel htmlFor="f-name">Nom du membre</FieldLabel>
      <Input id="f-name" placeholder="Ex. Yann Le Bris" />
      <FieldDescription>Le nom tel qu’il apparaîtra dans l’annuaire.</FieldDescription>
    </Field>
  ),
};

export const Invalid: Story = {
  render: () => (
    <Field className="w-80" data-invalid="true">
      <FieldLabel htmlFor="f-email">Adresse e-mail</FieldLabel>
      <Input id="f-email" aria-invalid placeholder="nom@exemple.fr" />
      <FieldError errors={[{ message: 'Adresse e-mail invalide.' }]} />
    </Field>
  ),
};

export const Group: Story = {
  render: () => (
    <FieldSet className="w-80">
      <FieldLegend>Informations du membre</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fg-first">Prénom</FieldLabel>
          <Input id="fg-first" placeholder="Yann" />
        </Field>
        <Field>
          <FieldLabel htmlFor="fg-bio">Biographie</FieldLabel>
          <Textarea id="fg-bio" placeholder="Quelques mots…" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
