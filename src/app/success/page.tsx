import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, ShieldCheck, Heart, ArrowRight } from 'lucide-react';

function SuccessContent() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8FAFC]">
      {/* Official Top Institutional Header */}
      <header className="bg-[#002B49] text-white py-4 px-4 border-b-4 border-[#00A3E0] shadow-md">
        <div className="max-w-4xl mx-auto flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 shrink-0 rounded-full overflow-hidden border-2 border-[#00A3E0] shadow-md bg-white">
              <Image
                src="/images/wasel-logo.jpg"
                alt="شعار حملة وَصْل الرسمية"
                fill
                priority
                className="object-cover"
              />
            </div>
            <div>
              <span className="text-base font-black text-white">حملة وَصْل</span>
              <span className="text-xs font-semibold text-[#00A3E0] mr-1.5 font-sans">| Wasel</span>
              <p className="text-[10px] text-slate-300">جامعة النجاح الوطنية</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00A3E0]/20 text-white border border-[#00A3E0]/40">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00A3E0]" />
            الحملة الرسمية المعتمدة
          </span>
        </div>
      </header>

      {/* Main Success Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-3xl p-8 md:p-12 max-w-xl w-full text-center animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-[#00A3E0]/15 text-[#002B49] rounded-full flex items-center justify-center mx-auto mb-6 border border-[#00A3E0]/30 shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-[#002B49]" />
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-[#002B49] mb-3">
            تم التسجيل بنجاح وجاهز!
          </h1>

          <p className="text-[#475569] text-base leading-relaxed mb-6">
            نشكرك على مبادرتك الإنسانية. تم استلام بياناتك وتخزينها بأمان في قاعدة بيانات المتبرعين المعتمدة لجامعة النجاح الوطنية.
          </p>

          <div className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-2xl p-4 text-xs text-[#475569] text-right leading-relaxed mb-8">
            <p className="font-bold text-[#002B49] mb-1.5 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-[#00A3E0]" />
              ملاحظة وإقرار الأهلية:
            </p>
            هذا التسجيل هو إبداء رغبة طوعية في التبرع المسبق بالدم، ولا يعتبر فحصاً أو تأكيداً للأهلية السريرية. سيتم التواصل معك عند الحاجة لتنسيق موعد الفحص المعتمد في بنك الدم.
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#002B49] hover:bg-[#002B49]/90 text-white rounded-xl text-sm font-bold transition shadow-sm"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            العودة لصفحة التسجيل الرئيسية
          </Link>
        </div>
      </main>

      {/* Official Footer */}
      <footer className="bg-white border-t border-[#E2E8F0] py-6 px-4 text-center text-xs text-[#475569]">
        <p>جميع الحقوق محفوظة © 2026 جامعة النجاح الوطنية — نابلس، فلسطين.</p>
      </footer>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
