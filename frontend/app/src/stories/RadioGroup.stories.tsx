import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const meta = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RadioGroup defaultValue="cornemuse" className="w-64">
      <div className="flex items-center gap-3">
        <RadioGroupItem value="cornemuse" id="r-cornemuse" />
        <Label htmlFor="r-cornemuse">Cornemuse</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="bombarde" id="r-bombarde" />
        <Label htmlFor="r-bombarde">Bombarde</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="caisse" id="r-caisse" />
        <Label htmlFor="r-caisse">Caisse claire</Label>
      </div>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup defaultValue="oui" className="w-64" disabled>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="oui" id="rd-oui" />
        <Label htmlFor="rd-oui">Oui</Label>
      </div>
      <div className="flex items-center gap-3">
        <RadioGroupItem value="non" id="rd-non" />
        <Label htmlFor="rd-non">Non</Label>
      </div>
    </RadioGroup>
  ),
};
