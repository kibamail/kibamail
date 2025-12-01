import type { SVGProps } from "react";

export function SmtpSvg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="currentColor"
      width="32px"
      height="32px"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>smtp</title>
      {/* S - blocky S shape */}
      <path d="M1,11H7V14H3V15H7V21H1V18H5V17H1Z" />
      {/* M - two legs with center peak */}
      <polygon points="9,21 9,11 11,11 13,15 15,11 17,11 17,21 15,21 15,14 13,18 11,14 11,21" />
      {/* T - horizontal bar with vertical stem */}
      <polygon points="19,13 21,13 21,21 23,21 23,13 25,13 25,11 19,11" />
      {/* P - vertical with rounded top */}
      <path d="M30,11H25V21h2V18h3a2,2,0,0,0,2-2V13A2,2,0,0,0,30,11Zm-3,5V13h3v3Z" />
    </svg>
  );
}
