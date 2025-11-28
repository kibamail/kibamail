import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Header } from "./_components/layout/header";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kibamail - Email Marketing Platform",
  description:
    "The open-source messaging platform for transactional and marketing email.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.className} antialiased flex flex-col min-h-screen bg-kb-bg-layout`}
      >
        <Header />
        <svg
          className="w-[1480px] mx-auto max-w-full h-[690px] absolute top-[200px] left-[50%] translate-x-[-50%]"
          viewBox="0 0 1440 690"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#filter0_d_399_12952)">
            <path
              d="M-860 315.25H127.5L325 505.25H1115L1312.5 315.25H2300V1024.25H-860V315.25Z"
              fill="currentColor"
              className="fill-current text-[#FAF7F5] dark:text-(--gray-800)"
            />
            <path
              d="M-860 315.25H127.5L325 505.25H1115L1312.5 315.25H2300V1024.25H-860V315.25Z"
              fill="black"
              fillOpacity="0.02"
            />
          </g>
          <g filter="url(#filter1_d_399_12952)">
            <path
              d="M2300 1024.25V315.25H1312.5L1115 505.25H325L127.5 315.25H-860V1024.25"
              stroke="#5B2F0E"
              strokeOpacity="0.1"
              strokeWidth="0.5"
              shapeRendering="crispEdges"
            />
          </g>
          <defs>
            <filter
              id="filter0_d_399_12952"
              x={-1110}
              y="0.25"
              width={3660}
              height={1209}
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity={0} result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy={-65} />
              <feGaussianBlur stdDeviation={125} />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.356863 0 0 0 0 0.184314 0 0 0 0 0.054902 0 0 0 0.1 0"
              />
              <feBlend
                mode="normal"
                in2="BackgroundImageFix"
                result="effect1_dropShadow_399_12952"
              />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="effect1_dropShadow_399_12952"
                result="shape"
              />
            </filter>
            <filter
              id="filter1_d_399_12952"
              x="-1110.25"
              y={0}
              width="3660.5"
              height="1209.25"
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
            >
              <feFlood floodOpacity={0} result="BackgroundImageFix" />
              <feColorMatrix
                in="SourceAlpha"
                type="matrix"
                values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                result="hardAlpha"
              />
              <feOffset dy={-65} />
              <feGaussianBlur stdDeviation={125} />
              <feComposite in2="hardAlpha" operator="out" />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.356863 0 0 0 0 0.184314 0 0 0 0 0.054902 0 0 0 0.1 0"
              />
              <feBlend
                mode="normal"
                in2="BackgroundImageFix"
                result="effect1_dropShadow_399_12952"
              />
              <feBlend
                mode="normal"
                in="SourceGraphic"
                in2="effect1_dropShadow_399_12952"
                result="shape"
              />
            </filter>
          </defs>
        </svg>
        <main className="w-full max-w-7xl mx-auto px-6 xl:px-0">
          {children}
        </main>
      </body>
    </html>
  );
}
