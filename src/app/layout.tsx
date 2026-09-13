import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PRODUCT_NAME } from "@/lib/product";
import { ProgressProvider } from "@/lib/state";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: PRODUCT_NAME,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: "Prove what you know on real practice problems, then build projects by directing the AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ProgressProvider>{children}</ProgressProvider>
      </body>
    </html>
  );
}
