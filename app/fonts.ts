import { Anton, Space_Grotesk, Space_Mono } from "next/font/google";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
});

// Shared by the root layout and global-error, which renders its own <html>.
export const fontVariables = `${anton.variable} ${spaceGrotesk.variable} ${spaceMono.variable}`;
