import type { SVGProps } from "react";

export function InboundIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 83.13 59.36"
      role="img"
      {...props}
    >
      <title>Inbound</title>
      <g>
        <path
          fill="currentColor"
          d="M77.1,59.36H6.35c-3.5,0-6.35-2.85-6.35-6.35V6.35C0,2.85,2.85,0,6.35,0H76.75c3.5,0,6.35,2.85,6.35,6.35v11.46h-5.94V6.35c0-.23-.19-.42-.42-.42H6.35c-.23,0-.42,.19-.42,.42V53.01c0,.23,.19,.42,.42,.42H77.1s.07-.03,.07-.07V26.75h5.94v26.61c0,3.31-2.69,6-6,6Z"
        />
        <polygon
          fill="currentColor"
          points="41.42 32.41 1.69 18.13 3.69 12.55 41.44 26.11 81.16 12.16 83.13 17.76 41.42 32.41"
        />
      </g>
    </svg>
  );
}
