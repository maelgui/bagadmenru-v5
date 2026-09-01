import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Event } from 'bagad-client';
import EventsManagePage from '../pages/events/events';

const mockEvents: Event[] = [
  {
    id: 1,
    title: 'Répétition hebdomadaire',
    description: 'Répétition de la section bombardes et cornemuses en salle communale.',
    date: new Date('2026-09-10'),
    category: 'repetition',
    costume: 'NONE',
    isInDoodle: false,
  },
  {
    id: 2,
    title: 'Sortie Festival Interceltique',
    description:
      "Grande sortie annuelle au FIL de Lorient. Départ 8h, prévoir le costume complet et le pique-nique. Le programme détaillé sera communiqué la semaine précédente.",
    date: new Date('2026-08-05'),
    category: 'sortie',
    costume: 'COSTUME',
    isInDoodle: true,
  },
  {
    id: 3,
    title: 'Réunion de bureau',
    description: 'Point trésorerie et préparation de la saison.',
    date: new Date('2026-07-01'),
    category: 'autre',
    costume: 'NONE',
    isInDoodle: false,
  },
];

const meta = {
  component: EventsManagePage,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      queryClient.setQueryData(
        ['events', 'list', { limit: 100, ordering: '-date' }],
        mockEvents,
      );
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
} satisfies Meta<typeof EventsManagePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  decorators: [
    (Story) => {
      const queryClient = new QueryClient();
      queryClient.setQueryData(['events', 'list', { limit: 100, ordering: '-date' }], []);
      return (
        <QueryClientProvider client={queryClient}>
          <Story />
        </QueryClientProvider>
      );
    },
  ],
};
