import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SplitCash - Expense & Income Tracker',
  description: 'Track your expenses and income in one place',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

