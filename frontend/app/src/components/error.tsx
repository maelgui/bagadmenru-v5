export default function Error({ error = undefined }: { error?: string }) {
  return (
    <div>
      Erreur :
      {' '}
      {error}
    </div>
  );
}
