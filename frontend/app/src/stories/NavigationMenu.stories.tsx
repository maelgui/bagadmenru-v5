import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';

const meta = {
  title: 'Components/NavigationMenu',
  component: NavigationMenu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NavigationMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Membres</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#">Annuaire</NavigationMenuLink>
            <NavigationMenuLink href="#">Groupes</NavigationMenuLink>
            <NavigationMenuLink href="#">Rôles</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Événements</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="#">Calendrier</NavigationMenuLink>
            <NavigationMenuLink href="#">Répétitions</NavigationMenuLink>
            <NavigationMenuLink href="#">Sorties</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="#">Photos</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
};
