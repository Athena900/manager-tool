import './globals.css'

export const metadata = {
  title: '売上管理システム',
  description: 'Supabaseリアルタイム同期対応',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
