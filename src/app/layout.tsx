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
  title: 'التسجيل المسبق للمتبرعين بالدم | جامعة النجاح الوطنية',
  description:
    'الحملة الرسمية للتسجيل المسبق للمتبرعين بالدم من طلبة وموظفي جامعة النجاح الوطنية لبناء قاعدة بيانات تطوعية.',
  openGraph: {
    title: 'التسجيل المسبق للمتبرعين بالدم | جامعة النجاح الوطنية',
    description:
      'ساهم في بناء قاعدة بيانات المتبرعين بالدم المعتمدة بجامعة النجاح الوطنية.',
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
