import { CalendarDays, ChevronDown, ListChecks, TableCellsMerge } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DisplaySelector() {
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
