import {
  CalendarDays, ChevronDown, ListChecks, TableCellsMerge, UserMinus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '../../../config/client';

export default function DisplaySelector() {
  const { can } = usePermissions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>
        Affichage
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/events/calendar" />}>
            <CalendarDays />
            Calendrier
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/events/planning" />}>
            <ListChecks />
            Planning
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/events/?noRedirect=true" />}>
            <TableCellsMerge />
            Doodle
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {can('view', 'response_history') ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to="/events/desinscriptions" />}>
                <UserMinus />
                Désinscriptions
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
