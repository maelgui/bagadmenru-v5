import { Inbox, UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { InboxEmail } from 'bagad-client';
import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useApiClient } from '../../../config/client';
import { cn } from '@/lib/utils';

interface EmailResponse {
  subject: string
  datetime: Date
  ago: number
  from?: string
  fromSm: string
}

const MS_PER_DAY = 86400000; // 1000 * 60 * 60 * 24
const MAX_INITIALS = 2;

function parseElem(data: InboxEmail): EmailResponse {
  const datetime = new Date(data.datetime);
  const ago = Math.round((new Date().getTime() - datetime.getTime()) / MS_PER_DAY);
  const from = data.from ?? null;
  return {
    ...data,
    ago,
    datetime,
    from: from ?? undefined,
    fromSm: from?.split(' ').map((name: string) => name[0].toUpperCase()).slice(0, MAX_INITIALS).join('') ?? '',
  };
}

export default function Mailbox() {
  const { utilsApi } = useApiClient();
  const { data: emails } = useQuery<EmailResponse[]>({
    queryKey: ['mailbox'],
    queryFn: async () => await utilsApi.getEmailsApiV1UtilsEmailsGet().then((data) => data.map(parseElem).sort((a, b) => a.ago - b.ago)),
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  if (!emails || emails.length === 0) return null;

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setDialogOpen(true)} aria-label={`${emails.length} mail${emails.length > 1 ? 's' : ''} non lu${emails.length > 1 ? 's' : ''}`}>
        <Inbox data-icon="inline-start" />
        Boite mail
        <Badge>{emails.length}</Badge>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="text-left">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Inbox />Emails non lus ({emails.length})</DialogTitle>
            <DialogDescription>Consultez les derniers emails arrivés dans la boite mail.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-border">
            {emails.map((email, index) => (
              <li key={`${email.subject}-${index}`} className="flex items-center gap-2 px-2 py-4">
                <Avatar className="size-12 bg-primary/10 font-bold" title={email.from}>
                  <AvatarFallback>{email.fromSm}</AvatarFallback>
                </Avatar>
                <div>
                  {email.subject}
                  <br />
                  <small title={email.datetime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} className="text-muted-foreground">
                    Il y a {email.ago} jour{email.ago > 1 ? 's' : ''}
                  </small>
                </div>
              </li>
            ))}
          </ul>
          <div>
            <h3 className="mb-2 text-lg font-semibold">Accès</h3>
            <dl className="px-2">
              <dt className="font-medium">Identifiant</dt>
              <dd className="flex items-center gap-2"><UserRound className="text-muted-foreground" /><span>contact@bagadmenru.bzh</span></dd>
            </dl>
            <p className="mt-2 px-2 text-sm text-muted-foreground">
              Le mot de passe n&apos;est pas affiché ici : demandez-le à un administrateur.
            </p>
          </div>
          <div className="text-right"><a className={cn(buttonVariants({ variant: 'outline' }))} href="https://www.ovhcloud.com/fr/mail/" target="_blank" rel="noreferrer">Accéder au webmail</a></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
