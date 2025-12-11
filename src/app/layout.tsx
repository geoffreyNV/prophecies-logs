import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prophecies Raid Analyzer',
  description: 'Analysez et comparez vos soirées de raid WoW via WarcraftLogs',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:wght@300;400;500&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var whTooltips = {
                colorLinks: true,
                iconizeLinks: true,
                renameLinks: true,
                locale: 'frFR'
              };
            `,
          }}
        />
        <script src="https://wow.zamimg.com/js/tooltips.js" async></script>
      </head>
      <body>{children}</body>
    </html>
  )
}

