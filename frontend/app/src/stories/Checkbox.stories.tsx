import type { Meta, StoryObj } from '@storybook/react-vite';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldContent, FieldDescription, FieldLabel } from '@/components/ui/field';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FieldLabel htmlFor="checkbox-default">
      <Field orientation="horizontal">
        <Checkbox id="checkbox-default" />
        <FieldContent>
          <FieldLabel htmlFor="checkbox-default">Notifications par email</FieldLabel>
          <FieldDescription>
            Recevoir un email pour chaque nouvel événement publié.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  ),
};

export const Checked: Story = {
  render: () => (
    <FieldLabel htmlFor="checkbox-checked">
      <Field orientation="horizontal">
        <Checkbox id="checkbox-checked" defaultChecked />
        <FieldContent>
          <FieldLabel htmlFor="checkbox-checked">Notifications push</FieldLabel>
          <FieldDescription>
            Recevoir une notification push sur votre appareil.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  ),
};

export const LongContent: Story = {
  render: () => (
    <FieldLabel htmlFor="checkbox-long">
      <Field orientation="horizontal">
        <Checkbox id="checkbox-long" />
        <FieldContent>
          <FieldLabel htmlFor="checkbox-long">Accepter les conditions</FieldLabel>
          <FieldDescription>
            En cochant cette case, vous acceptez les conditions générales
            d’utilisation et la politique de confidentialité du site. Vos données
            seront traitées conformément au RGPD.
          </FieldDescription>
        </FieldContent>
      </Field>
    </FieldLabel>
  ),
};
