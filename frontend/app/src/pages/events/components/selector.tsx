import {
  faCalendarDay,
  faCaretDown,
  faChessBoard,
  faListCheck,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import Button from '../../../components/button';
import Dropdown, { DropdownContent, DropdownTrigger } from '../../../components/dropdown';

export default function DisplaySelector() {
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <Button icon={faCaretDown}>
          Affichage

        </Button>
      </DropdownTrigger>
      <DropdownContent>
        <Button as={Link} variant="ghost" to="/events/calendar" icon={faCalendarDay}>Calendrier</Button>
        <Button as={Link} variant="ghost" to="/events/planning" icon={faListCheck}>Planning</Button>
        <Button as={Link} variant="ghost" to="/events/?noRedirect=true" icon={faChessBoard}>Doodle</Button>
      </DropdownContent>
    </Dropdown>
  );
}
