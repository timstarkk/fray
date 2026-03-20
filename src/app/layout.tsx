import type { Metadata } from "next"
import { Geist, Geist_Mono, Sora } from "next/font/google"
import "./globals.css"
import ConfigureAmplify from "@/components/configure-amplify"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
})

export const metadata: Metadata = {
  title: "Fray",
  description: "Multi-persona group chat with emergent turn-taking",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased`}
      >
        <ConfigureAmplify />
        {children}
      </body>
    </html>
  )
}
