export default function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="block w-full border-gray-200 rounded py-2 px-4 border-2 border-gray-200 focus:outline-none focus:bg-white focus:border-pourpre-400"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}
