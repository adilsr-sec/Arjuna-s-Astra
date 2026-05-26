import "./globals.css";
import { ReactNode } from "react";

export const metadata = {
  title: "ARJUNA'S ARROW",
  description: "Invisible Communication. Unbreakable Security."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
