import {
  CalendarDays, Check, ChevronDown, Copy,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import env from '../../../env';

const COPY_FEEDBACK_MS = 2000;

/**
 * Calendar subscription actions (Google Agenda link + copy the ICS URL),
 * shared by the event pages (Doodle, Planning, Gestion). Mirrors the export
 * offered on the calendar page, but packaged as a header dropdown so it fits
 * next to the other header actions without cluttering the layout.
 */
export default function IcsExportMenu() {
  const [copied, setCopied] = useState(false);
  const icsUrl = `${env.VITE_BBE2_API_URL}/api/v1/events/export/ics`;
  const googleUrl = `https://www.google.com/calendar/render?cid=${env.VITE_BBE2_API_URL.replace('https://', 'webcal://')}/api/v1/events/export/ics`;

  const onCopy = () => {
    void navigator.clipboard.writeText(icsUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        Synchroniser
        <ChevronDown data-icon="inline-end" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ajouter à mon calendrier</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to={googleUrl} />}>
            <CalendarDays aria-hidden="true" />
            Google Agenda
          </DropdownMenuItem>
          {/* Keep the menu open so the "Copié !" feedback is visible. */}
          <DropdownMenuItem
            onClick={(event) => {
              event.preventDefault();
              onCopy();
            }}
          >
            {copied
              ? <Check aria-hidden="true" />
              : <Copy aria-hidden="true" />}
            {copied ? 'Copié !' : "Copier l'URL ICS"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copié dans le presse-papiers.' : ''}
      </span>
    </DropdownMenu>
  );
}
