import type { Meta, StoryObj } from '@storybook/react-vite';
import Container from '../components/container';

const meta = {
  title: 'Layout/Container',
  component: Container,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: null,
  },
  render: () => (
    <Container className="bg-muted/40">
      <p>
        Le conteneur centre son contenu avec une largeur maximale et applique une
        marge intérieure standard. Redimensionnez la fenêtre pour observer le
        comportement responsive.
      </p>
    </Container>
  ),
};
