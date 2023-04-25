import { useLoaderData } from 'react-router-dom';

export default function Debug() {
  const data = useLoaderData() as any;
  return (
    <div>{JSON.stringify(data)}</div>
  );
}
