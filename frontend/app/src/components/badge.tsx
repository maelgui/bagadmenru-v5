import { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode,
  color?: string,
}


export default function Badge({ children, color = "bg-gray-500" }: BadgeProps) {
  return (
    <span className={`px-2 m-8 rounded-md overflow-hidden text-white font-medium text-sm ${color}`}>
      {children}
    </span>
  );
}
