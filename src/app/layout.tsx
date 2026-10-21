import type { Metadata } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'حملة وَصْل | Wasel — التسجيل المسبق للمتبرعين بالدم | جامعة النجاح الوطنية',
  description:
    'حملة وَصْل الرسمية للتسجيل المسبق للمتبرعين بالدم من طلبة وموظفي جامعة النجاح الوطنية — قطرة منك .. حياة لإنسان.',
  openGraph: {
    title: 'حملة وَصْل | Wasel — جامعة النجاح الوطنية',
    description:
      'حملة وَصْل: قطرة منك .. حياة لإنسان. ساهم في بناء قاعدة بيانات المتبرعين بالدم المعتمدة بجامعة النجاح الوطنية.',
    locale: 'ar_PS',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="flex flex-col min-h-screen antialiased bg-[#F8FAFC] text-[#0F172A]">
        {children}
      </body>
    </html>
  );
}
