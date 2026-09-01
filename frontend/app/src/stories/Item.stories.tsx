import { Music, Trash2 } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';

const meta = {
  title: 'Components/Item',
  component: Item,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['default', 'outline', 'muted'],
      control: { type: 'select' },
    },
    size: {
      options: ['default', 'sm', 'xs'],
      control: { type: 'select' },
    },
  },
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'outline',
  },
  render: (args) => (
    <Item {...args}>
      <ItemMedia variant="icon">
        <Music />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Cornemuse</ItemTitle>
        <ItemDescription>Pupitre des bois — 12 sonneurs</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon-sm" aria-label="Supprimer">
          <Trash2 />
        </Button>
      </ItemActions>
    </Item>
  ),
};

export const Group: Story = {
  render: () => (
    <ItemGroup>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Cornemuse</ItemTitle>
          <ItemDescription>Pupitre des bois</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Bombarde</ItemTitle>
          <ItemDescription>Pupitre des bois</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>Caisse claire</ItemTitle>
          <ItemDescription>Pupitre des percussions</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};
