import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const meta = {
  title: 'Components/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Choisir un instrument" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cornemuse">Cornemuse</SelectItem>
        <SelectItem value="bombarde">Bombarde</SelectItem>
        <SelectItem value="caisse">Caisse claire</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Choisir un pupitre" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Bois</SelectLabel>
          <SelectItem value="cornemuse">Cornemuse</SelectItem>
          <SelectItem value="bombarde">Bombarde</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Percussions</SelectLabel>
          <SelectItem value="caisse">Caisse claire</SelectItem>
          <SelectItem value="grosse">Grosse caisse</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Indisponible" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1">Indisponible</SelectItem>
      </SelectContent>
    </Select>
  ),
};
