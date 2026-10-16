import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ustoz — найди своего преподавателя",
  description: "Репетиторы и курсы учебных центров Узбекистана. Выбирайте, учитесь и двигайтесь к своей цели.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
