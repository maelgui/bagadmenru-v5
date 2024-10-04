import Alert from '../../../components/alert';
import Button from '../../../components/button';

export default function Mailbox() {
  const nEmails = 3;
  return (
    <Alert type="info">
      <p>
        Il y a
        {' '}
        <strong>{nEmails}</strong>
        {' '}
        mail non lus dans la boite mail.
        {' '}
        <Button variant="ghost" as="a" href="https://www.ovhcloud.com/fr/mail/" target="_blank">Voir</Button>
      </p>
    </Alert>
  );
}
