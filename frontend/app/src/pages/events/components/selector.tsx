import { ChevronDown } from 'lucide-react';
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
import { isAllowed } from '../../../config/navigation';
import { EVENT_VIEWS, RESPONSE_HISTORY_PAGE } from '../sections';

export default function DisplaySelector() {
  const { can } = usePermissions();
  const views = EVENT_VIEWS.filter((view) => isAllowed(view, can));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button />}>
        Affichage
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          {views.map(({ to, label, icon: Icon }) => (
            <DropdownMenuItem key={to} render={<Link to={to} />}>
              <Icon />
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {isAllowed(RESPONSE_HISTORY_PAGE, can) ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link to={RESPONSE_HISTORY_PAGE.to} />}>
                <RESPONSE_HISTORY_PAGE.icon />
                {RESPONSE_HISTORY_PAGE.label}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
