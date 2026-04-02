import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "NO Worktime",
  description: "Professional time tracking and payroll for your teams.",
  icons: {
    icon: "/notime-loader.png",
    apple: "/notime-loader.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} antialiased`}>
        <div className="app-canvas min-h-screen">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
