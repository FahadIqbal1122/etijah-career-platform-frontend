import { Tajawal, IBM_Plex_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const GA_MEASUREMENT_ID = 'G-RHL2CLN46Y'

// Etijahi brand type system — Tajawal (Arabic + Latin, our primary) + IBM Plex Mono
// (the uppercase "eyebrow" labels). Non-variable fonts, so weights are explicit.
const tajawal = Tajawal({
  variable: '--font-tajawal',
  weight: ['400', '500', '700', '800', '900'],
  subsets: ['arabic', 'latin'],
  display: 'swap',
})
const plexMono = IBM_Plex_Mono({
  variable: '--font-mono',
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning className={`${tajawal.variable} ${plexMono.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        {children}
      </body>
    </html>
  )
}
