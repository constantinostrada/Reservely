import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reservely - Reservation Management System',
  description: 'A modern reservation management system built with clean architecture',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
