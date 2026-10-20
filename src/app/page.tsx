import React from 'react';
import Image from 'next/image';
import RegistrationForm from '@/components/RegistrationForm';
import { ShieldCheck, HeartHandshake, QrCode } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between">
      {/* Official Top Institutional Header */}
      <header className="bg-[#002B49] text-white py-6 px-4 border-b-4 border-[#00A3E0] shadow-md">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-48 h-12">
              <Image
                src="/images/najah-logo.svg"
                alt="شعار جامعة النجاح الوطنية"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00A3E0]/20 text-white border border-[#00A3E0]/40">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00A3E0]" />
              الحملة التطوعية الرسمية المعتمدة
            </span>
          </div>
        </div>
      </header>

      {/* Main Campaign Hero Content */}
      <section className="max-w-3xl mx-auto px-4 pt-8 pb-4 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-[#002B49]/5 rounded-2xl mb-4 border border-[#002B49]/10">
          <HeartHandshake className="w-8 h-8 text-[#002B49]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#002B49] mb-3">
          التسجيل المسبق للمتبرعين بالدم
        </h1>
        <p className="text-sm md:text-base text-[#475569] max-w-2xl mx-auto leading-relaxed">
          ساهم في بناء قاعدة بيانات للمتبرعين بالدم من طلبة وموظفي جامعة النجاح الوطنية، لنتمكن من التواصل معك عند الحاجة لإنقاذ حياة أبناء شعبنا.
        </p>
      </section>

      {/* Registration Form Component */}
      <section className="px-4 pb-12 flex-1">
        <RegistrationForm />
      </section>

      {/* Official Institutional Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-6 px-4 text-center text-xs text-[#475569]">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            جميع الحقوق محفوظة © 2026 جامعة النجاح الوطنية — نابلس، فلسطين.
          </p>
          <div className="flex items-center gap-2 text-[#002B49] font-medium">
            <QrCode className="w-4 h-4 text-[#00A3E0]" />
            <span>نظام التسجيل المسبق عبر مسح الرمز</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
