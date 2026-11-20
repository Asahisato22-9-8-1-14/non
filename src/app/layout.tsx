import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "StudyX — Study Like a Learning Scientist",
  description:
    "StudyX: an offline-first study system with 49 connected steps, mind maps, notes, flashcards and spaced repetition.",
  manifest: "/manifest.json",
  applicationName: "StudyX",
  icons: {
    icon: "/study-x-icon.png",
    apple: "/study-x-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#efe0ad",
};

// Applies the saved theme before paint (defaults to light on first visit).
// Sets both data-theme (Study System) and the .dark class (study app).
const themeScript = `(function(){try{var d=localStorage.getItem('theme')==='dark';var r=document.documentElement;r.setAttribute('data-theme',d?'dark':'light');if(d)r.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={inter.variable}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
