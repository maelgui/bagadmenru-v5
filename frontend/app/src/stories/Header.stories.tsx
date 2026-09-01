import { PlusIcon } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react-vite';
import Header from '../components/header';

const meta = {
  title: 'Layout/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Membres',
  },
};

export const WithSubtitle: Story = {
  args: {
    title: 'Membres',
    subtitle: '42 membres actifs',
  },
};

export const WithActions: Story = {
  args: {
    title: 'Membres',
    subtitle: '42 membres actifs',
    actions: [
      <Header.Action key="add">
        <PlusIcon data-icon="inline-start" />
        Ajouter un membre
      </Header.Action>,
    ],
  },
};

export const WithBreadcrumb: Story = {
  args: {
    title: 'Yann Le Bris',
    subtitle: 'Cornemuse',
    breadcrumb: [
      { title: 'Membres', link: '/profiles' },
      { title: 'Yann Le Bris' },
    ],
  },
};
