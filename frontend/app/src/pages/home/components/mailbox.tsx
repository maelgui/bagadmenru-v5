import { faInbox, faKey, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import Alert from '../../../components/alert';
import Button from '../../../components/button';
import {
  Dialog, DialogClose, DialogContent, DialogHeading,
} from '../../../components/dialog';

type EmailResponse = {
  id: string,
  subject: string,
  datetime: Date,
  ago: number,
  from: string,
  fromSm: string,
};
// eslint-disable-next-line max-len
function parseElem(data: { subject: string, datetime: string, from: string, id: string }): EmailResponse {
  const parsedDate = new Date(data.datetime);
  const now = new Date();
  const ago = Math.round((now.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    ...data,
    ago,
    datetime: parsedDate,
    fromSm: data.from.split(' ').map((n) => n[0].toUpperCase()).join(''),
  };
}
export default function Mailbox() {
  const { user } = useAuth();

  const { data: emails } = useQuery<EmailResponse[]>({
    queryKey: ['mailbox'],
    queryFn: () => axios.get('http://localhost:9999/emails', { headers: { Authorization: `Bearer ${user?.access_token}` } })
      .then(({ data }: { data: Array<any> }) => data.map(parseElem).sort((a, b) => a.ago - b.ago)),
  });
  console.log(emails);
  const [dialogOpen, setdialogOpen] = useState<boolean>(false);

  if (!emails) {
    return null;
  }

  const nEmails = emails.length;

  return (
    <>
      <Alert type="info">
        <p>
          Il y a
          {' '}
          <strong>{nEmails}</strong>
          {' '}
          mail non lus dans la boite mail.
          {' '}
          <Button variant="ghost" onClick={() => setdialogOpen(true)}>Détails</Button>
        </p>
      </Alert>
      <Dialog open={dialogOpen} onOpenChange={setdialogOpen}>
        <DialogContent className="!text-left">
          <DialogHeading>
            <div className="inline-flex mx-auto mb-4 h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-sky-100">
              <FontAwesomeIcon icon={faInbox} className="h-5 w-5 text-sky-600" />
              <DialogClose />
            </div>
          </DialogHeading>
          <h3 className="text-lg font-semibold mt-4 mb-2">
            Email non lus (
            {emails.length}
            )
          </h3>
          <ul className="divide-y">
            {emails.map((email) => (
              <li key={email.id} className="flex items-center py-4 px-2">
                <div className="h-12 w-12 mr-2 grid place-items-center bg-pourpre-100 rounded-full font-bold" title={email.from}>{email.fromSm}</div>
                <div>
                  {email.subject}
                  <br />
                  <small
                    className="text-gray-500"
                    title={email.datetime.toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  >
                    Il y a
                    {' '}
                    {email.ago}
                    {' '}
                    jour
                    {email.ago > 1 ? 's' : ''}
                  </small>
                </div>
              </li>
            ))}
          </ul>
          <h3 className="text-lg font-semibold mt-4 mb-2">Accès</h3>
          <dl className="px-2">
            <dt className="font-medium">Identifiant</dt>
            <dd>
              <FontAwesomeIcon icon={faUser} className="text-gray-700" />
              <span className="ml-2">contact@baadmenru.bzh</span>
            </dd>
            <dt className="font-medium">Mot de passe</dt>
            <dd>
              <FontAwesomeIcon icon={faKey} className="text-gray-700" />
              <span className="ml-2">xxx</span>
            </dd>
          </dl>
          <div className="text-right">
            <Button variant="outline" as="a" href="https://www.ovhcloud.com/fr/mail/" target="_blank">Accéder au webmail</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
