import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from '@/components/ui/native-select';

const meta = {
  title: 'Components/NativeSelect',
  component: NativeSelect,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      options: ['sm', 'default'],
      control: { type: 'radio' },
    },
  },
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <NativeSelect {...args}>
      <NativeSelectOption value="cornemuse">Cornemuse</NativeSelectOption>
      <NativeSelectOption value="bombarde">Bombarde</NativeSelectOption>
      <NativeSelectOption value="caisse">Caisse claire</NativeSelectOption>
    </NativeSelect>
  ),
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
  render: (args) => (
    <NativeSelect {...args}>
      <NativeSelectOption value="1">Actif</NativeSelectOption>
      <NativeSelectOption value="2">Inactif</NativeSelectOption>
    </NativeSelect>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <NativeSelect>
      <NativeSelectOptGroup label="Bois">
        <NativeSelectOption value="cornemuse">Cornemuse</NativeSelectOption>
        <NativeSelectOption value="bombarde">Bombarde</NativeSelectOption>
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="Percussions">
        <NativeSelectOption value="caisse">Caisse claire</NativeSelectOption>
        <NativeSelectOption value="grosse">Grosse caisse</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  ),
};

export const Disabled: Story = {
  render: () => (
    <NativeSelect disabled>
      <NativeSelectOption value="1">Indisponible</NativeSelectOption>
    </NativeSelect>
  ),
};
