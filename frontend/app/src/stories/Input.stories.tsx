import type { Meta, StoryObj } from '@storybook/react-vite';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: {
    type: 'text',
  },
};

export const Date: Story = {
  args: {
    type: 'date',
  },
};

export const Disabled: Story = {
  args: {
    type: 'text',
    value: 'Mon text',
    disabled: true,
  },
};

export const Error: Story = {
  render: () => (
    <Field data-invalid>
      <FieldLabel htmlFor="input-error">Nom</FieldLabel>
      <Input id="input-error" type="text" defaultValue="Mon text" aria-invalid />
      <FieldDescription className="text-destructive">
        Mon message d’erreur
      </FieldDescription>
    </Field>
  ),
};
