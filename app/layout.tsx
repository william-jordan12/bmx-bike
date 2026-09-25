import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ride-bmx.example"),
  title: {
    default: "RIDE//BMX | Complete BMX Bikes & Parts",
    template: "%s | RIDE//BMX"
  },
  description:
    "Shop complete BMX bikes, parts, and rider essentials from RIDE//BMX. Built for street, park, race, and everything between.",
  keywords: ["BMX bikes", "complete BMX bikes", "freestyle BMX", "BMX parts", "BMX shop"],
  openGraph: {
    title: "RIDE//BMX | Complete BMX Bikes & Parts",
    description: "Find your next BMX setup and ride it with confidence.",
    type: "website",
    siteName: "RIDE//BMX"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
