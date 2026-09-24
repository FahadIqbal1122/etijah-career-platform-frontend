import { Tajawal, IBM_Plex_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

// Direct GA4 install — only used until the GTM container ID below is set; once GTM is live, GA4 is
// configured as a tag inside Tag Manager (two installs would double-count page views).
const GA_MEASUREMENT_ID = 'G-RHL2CLN46Y'

// Google Tag Manager container. Replace with the real ID from tagmanager.google.com;
// while it is still the placeholder, nothing is injected.
const GTM_ID: string = 'GTM-5W7469W3'
const GTM_ENABLED = GTM_ID !== 'GTM-XXXXXXX'

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
      {GTM_ENABLED && (
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
            }}
          />
        </head>
      )}
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {GTM_ENABLED && (
          <noscript>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
          </noscript>
        )}
        {!GTM_ENABLED && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  )
}
