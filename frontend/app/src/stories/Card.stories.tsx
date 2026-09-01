import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Répétition hebdomadaire</CardTitle>
        <CardDescription>Mercredi 20h — Salle des fêtes</CardDescription>
      </CardHeader>
      <CardContent>
        Pensez à apporter vos partitions et votre instrument. La répétition
        portera sur le nouveau répertoire de printemps.
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Décliner</Button>
        <Button>Je participe</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Yann Le Bris</CardTitle>
        <CardDescription>Sonneur — Cornemuse</CardDescription>
        <CardAction>
          <Badge variant="secondary">Actif</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>Membre depuis 2018. Pupitre cornemuse.</CardContent>
    </Card>
  ),
};

export const Small: Story = {
  render: () => (
    <Card size="sm" className="w-64">
      <CardHeader>
        <CardTitle>Note rapide</CardTitle>
      </CardHeader>
      <CardContent>Une carte compacte avec un espacement réduit.</CardContent>
    </Card>
  ),
};
