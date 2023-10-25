import logo from '../assets/logov2full.svg';

export default function ErrorLayout({ children }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className="p-4 min-h-screen flex ">
      <div className="m-auto max-w-md w-full align-middle">
        <div className="flex justify-center">
          <img src={logo} alt="bagad men ru" className="h-64 m-4 pulse" />
        </div>
        {children}
      </div>
    </div>
  );
}
