import React from 'react';
import Image from 'next/image';
import RegistrationForm from '@/components/RegistrationForm';
import { ShieldCheck, HeartHandshake, QrCode } from 'lucide-react';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // Automatic Keep-Alive: Ping database on every page visit to prevent inactivity pause
  try {
    const supabase = getServiceSupabase();
    if (supabase) {
      await supabase.from('donor_registrations').select('id').limit(1);
    }
  } catch (err) {
    // Silent catch so it never affects user rendering
  }

  return (
    <main className="min-h-screen flex flex-col justify-between">
      {/* Official Top Institutional Header with Wasel Campaign Branding */}
      <header className="bg-[#002B49] text-white py-4 px-4 border-b-4 border-[#00A3E0] shadow-md">
        <div className="max-w-4xl mx-auto flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="relative w-14 h-14 md:w-16 md:h-16 shrink-0 rounded-full overflow-hidden border-2 border-[#00A3E0] shadow-md bg-white">
              <Image
                src="/images/wasel-logo.jpg"
                alt="شعار حملة وَصْل الرسمية"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl md:text-2xl font-black text-white tracking-wide">
                  وَصْل
                </span>
                <span className="text-xl md:text-2xl font-black text-[#00A3E0] font-sans tracking-wide">
                  | Wasel
                </span>
              </div>
              <p className="text-[11px] md:text-xs text-slate-300 font-medium">
                قطرة منك .. حياة لإنسان — جامعة النجاح الوطنية
              </p>
            </div>
          </div>

          <div className="hidden sm:block text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00A3E0]/20 text-white border border-[#00A3E0]/40">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00A3E0]" />
              الحملة الرسمية المعتمدة
            </span>
          </div>
        </div>
      </header>

      {/* Main Campaign Hero Content */}
      <section className="max-w-3xl mx-auto px-4 pt-8 pb-4 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-[#002B49]/5 rounded-2xl mb-4 border border-[#002B49]/10">
          <HeartHandshake className="w-8 h-8 text-[#002B49]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#002B49] mb-2">
          التسجيل المسبق للمتبرعين بالدم
        </h1>
        <p className="text-sm md:text-base font-bold text-[#00A3E0] mb-2">
          حملة وَصْل (Wasel) — قطرة منك .. حياة لإنسان
        </p>
        <p className="text-xs md:text-sm text-[#475569] max-w-2xl mx-auto leading-relaxed">
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
