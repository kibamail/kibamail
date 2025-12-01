import type { SVGProps } from "react";

export function NigeriaFlagIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden="true"
      viewBox="0 0 28 20"
      {...props}
    >
      <title>Nigeria Flag</title>
      <path fill="#fff" d="M0 0h28v20H0V0z" />
      <path fill="#189B62" d="M18.667 0H28v20h-9.333V0z" />
      <path
        fill="#189B62"
        fillRule="evenodd"
        d="M0 20h9.333V0H0v20z"
        clipRule="evenodd"
      />
    </svg>
  );
}
