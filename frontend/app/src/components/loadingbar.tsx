import { useIsFetching } from 'react-query';

export default function LoadingBar() {
  const isFetching = useIsFetching();

  return (
    <div className={`transition-all fixed top-0 left-0 h-1 bg-pourpre-500 ${isFetching ? ' w-1/5' : 'w-full opacity-0'}`} />
  );
}
