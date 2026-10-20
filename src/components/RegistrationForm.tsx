'use client';

import React, { useState } from 'react';
import {
  BLOOD_TYPES,
  CAMPUSES,
  GOVERNORATES,
  AVAILABILITY_STATUSES,
  GENDER_OPTIONS,
} from '@/types/donor';
import { OFFICIAL_CONSENT_TEXT } from '@/lib/validation';
import {
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Phone,
  User,
  Heart,
  Calendar,
  MapPin,
  FileText,
  Loader2,
} from 'lucide-react';

export default function RegistrationForm() {
  const [formData, setFormData] = useState({
    fullName: '',
    universityId: '',
    campus: CAMPUSES[0],
    phoneNumber: '',
    age: '',
    gender: GENDER_OPTIONS[0],
    bloodType: 'UNKNOWN',
    governorate: GOVERNORATES[0],
    cityOrVillage: '',
    availabilityStatus: AVAILABILITY_STATUSES[0],
    lastDonationDate: '',
    healthDisclosure: '',
    consentGiven: false,
    honeypot: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successData, setSuccessData] = useState<{
    referenceId: string;
    message: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    // Clear error on edit
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setFieldErrors({});

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? Number(formData.age) : undefined,
          lastDonationDate: formData.lastDonationDate || null,
          healthDisclosure: formData.healthDisclosure || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر إتمام التسجيل. يرجى مراجعة البيانات.');
        if (data.details) {
          setFieldErrors(data.details);
        }
      } else {
        setSuccessData({
          referenceId: data.referenceId || 'CONFIRMED',
          message: data.message,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-6 md:p-10 max-w-2xl mx-auto my-8 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-[#00A3E0]/15 text-[#002B49] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#00A3E0]/30">
          <CheckCircle2 className="w-9 h-9 text-[#002B49]" />
        </div>
        <h2 className="text-2xl font-bold text-[#002B49] mb-2">
          تم استلام تسجيلك بنجاح
        </h2>
        <p className="text-[#475569] mb-6 leading-relaxed">
          {successData.message}
        </p>

        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 mb-6">
          <span className="text-xs text-[#475569] block mb-1 font-medium">الرقم المرجعي للتسجيل</span>
          <span className="text-xl font-bold font-mono tracking-wider text-[#002B49] ltr-content inline-block">
            {successData.referenceId}
          </span>
        </div>

        <div className="text-xs text-[#475569] bg-[#F1F5F9] rounded-lg p-3 text-right leading-relaxed mb-6 border border-[#CBD5E1]">
          <p className="font-semibold text-[#0F172A] mb-1">تنبيه وملاحظة هامة:</p>
          يعد هذا التسجيل إبداءً للرغبة في التبرع المسبق بالدم ولا يعتبر إقراراً طبياً بالأهلية للتبرع. سيتم التواصل معك عند الحاجة لإجراء الفحص السريري المعتمد في بنك الدم.
        </div>

        <button
          onClick={() => {
            setSuccessData(null);
            setFormData({
              fullName: '',
              universityId: '',
              campus: CAMPUSES[0],
              phoneNumber: '',
              age: '',
              gender: GENDER_OPTIONS[0],
              bloodType: 'UNKNOWN',
              governorate: GOVERNORATES[0],
              cityOrVillage: '',
              availabilityStatus: AVAILABILITY_STATUSES[0],
              lastDonationDate: '',
              healthDisclosure: '',
              consentGiven: false,
              honeypot: '',
            });
          }}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-[#002B49] hover:bg-[#002B49]/90 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          تسجيل متبرع جديد
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-[#E2E8F0] shadow-sm rounded-2xl p-5 md:p-8 max-w-3xl mx-auto my-6"
    >
      {/* Honeypot field: hidden from genuine users */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website-hp">يرجى ترك هذا الحقل فارغاً</label>
        <input
          id="website-hp"
          type="text"
          name="honeypot"
          value={formData.honeypot}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-[#F8FAFC] border-2 border-[#002B49] text-[#0F172A] flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#002B49] shrink-0 mt-0.5" />
          <div className="text-sm font-medium leading-relaxed">{errorMsg}</div>
        </div>
      )}

      {/* 1. Identity & University Affiliation */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E2E8F0]">
          <User className="w-5 h-5 text-[#002B49]" />
          <h3 className="text-base font-bold text-[#002B49]">
            المعلومات الشخصية والأكاديمية
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              الاسم الرباعي كاملاً <span className="text-[#002B49] font-bold">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="مثال: أحمد خليل عبد الرحمن مسعود"
              value={formData.fullName}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]"
            />
            {fieldErrors.fullName && (
              <p className="text-xs text-[#002B49] font-medium mt-1">
                {fieldErrors.fullName[0]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              الرقم الجامعي أو الوظيفي <span className="text-[#002B49] font-bold">*</span>
            </label>
            <input
              type="text"
              name="universityId"
              required
              placeholder="مثال: 12115689"
              value={formData.universityId}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] font-mono ltr-content"
            />
            {fieldErrors.universityId && (
              <p className="text-xs text-[#002B49] font-medium mt-1">
                {fieldErrors.universityId[0]}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              موقع الحرم الجامعي الأساسي <span className="text-[#002B49] font-bold">*</span>
            </label>
            <select
              name="campus"
              value={formData.campus}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
            >
              {CAMPUSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. Contact & Demographics */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E2E8F0]">
          <Phone className="w-5 h-5 text-[#002B49]" />
          <h3 className="text-base font-bold text-[#002B49]">
            معلومات الاتصال والبيانات الديمغرافية
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              رقم الهاتف المحمول (جوال/أوريدو) <span className="text-[#002B49] font-bold">*</span>
            </label>
            <input
              type="tel"
              name="phoneNumber"
              required
              placeholder="059xxxxxxx أو 056xxxxxxx"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] font-mono ltr-content"
            />
            {fieldErrors.phoneNumber && (
              <p className="text-xs text-[#002B49] font-medium mt-1">
                {fieldErrors.phoneNumber[0]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              العمر (سنة) <span className="text-[#002B49] font-bold">*</span>
            </label>
            <input
              type="number"
              name="age"
              min="16"
              max="75"
              required
              placeholder="مثال: 21"
              value={formData.age}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-mono ltr-content"
            />
            {fieldErrors.age && (
              <p className="text-xs text-[#002B49] font-medium mt-1">
                {fieldErrors.age[0]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              الجنس <span className="text-[#002B49] font-bold">*</span>
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
            >
              {GENDER_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Blood Information & Medical Notes */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E2E8F0]">
          <Heart className="w-5 h-5 text-[#002B49]" />
          <h3 className="text-base font-bold text-[#002B49]">
            زمرة الدم وسجل التبرع (بيانات ذاتية)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              زمرة الدم (المعروفة لك) <span className="text-[#002B49] font-bold">*</span>
            </label>
            <select
              name="bloodType"
              value={formData.bloodType}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-semibold"
            >
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt === 'UNKNOWN' ? 'غير متأكد / لا أعلم بالتحديد' : bt}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[#475569] block mt-1">
              * يتم التعامل مع زمرة الدم كبيان ذاتي من قبلك يخضع للتحقق المخبري لاحقاً.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              حالة الاستعداد الحالية للتواصل <span className="text-[#002B49] font-bold">*</span>
            </label>
            <select
              name="availabilityStatus"
              value={formData.availabilityStatus}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
            >
              <option value="AVAILABLE">مستعد وجاهز للتواصل عند الحاجة</option>
              <option value="CURRENTLY_UNAVAILABLE">غير متاح حالياً للتبرع</option>
              <option value="RECENTLY_DONATED">تبرعت بالدم مؤخراً</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              تاريخ آخر تبرع بالدم (اختياري)
            </label>
            <input
              type="date"
              name="lastDonationDate"
              value={formData.lastDonationDate}
              onChange={handleChange}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] ltr-content"
            />
            {fieldErrors.lastDonationDate && (
              <p className="text-xs text-[#002B49] font-medium mt-1">
                {fieldErrors.lastDonationDate[0]}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              ملاحظة صحية ذاتية إن وجدت (اختياري)
            </label>
            <input
              type="text"
              name="healthDisclosure"
              placeholder="مثال: حساسية موسمية خفيفة، لا توجد أمراض..."
              value={formData.healthDisclosure}
              onChange={handleChange}
              maxLength={500}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]"
            />
          </div>
        </div>
      </div>

      {/* 4. Geographic Location */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E2E8F0]">
          <MapPin className="w-5 h-5 text-[#002B49]" />
          <h3 className="text-base font-bold text-[#002B49]">
            مكان السكن والإقامة للتنسيق الجغرافي
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              المحافظة <span className="text-[#002B49] font-bold">*</span>
            </label>
            <select
              name="governorate"
              value={formData.governorate}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
            >
              {GOVERNORATES.map((gov) => (
                <option key={gov} value={gov}>
                  {gov}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              المدينة أو القرية أو البلدة <span className="text-[#002B49] font-bold">*</span>
            </label>
            <input
              type="text"
              name="cityOrVillage"
              required
              placeholder="مثال: رفيديا، عصيرة الشمالية، صرة..."
              value={formData.cityOrVillage}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]"
            />
            {fieldErrors.cityOrVillage && (
              <p className="text-xs text-[#002B49] font-medium mt-1">
                {fieldErrors.cityOrVillage[0]}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Privacy & Explicit Consent */}
      <div className="mb-8 p-5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-[#002B49]" />
          <h4 className="text-sm font-bold text-[#002B49]">
            سياسة الخصوصية والإقرار بالموافقة الصريحة
          </h4>
        </div>
        <p className="text-xs text-[#475569] leading-relaxed mb-4 text-justify">
          {OFFICIAL_CONSENT_TEXT}
        </p>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            name="consentGiven"
            checked={formData.consentGiven}
            onChange={handleChange}
            required
            className="mt-1 w-4 h-4 rounded border-gray-300 text-[#002B49] focus:ring-[#00A3E0]"
          />
          <span className="text-xs font-semibold text-[#0F172A]">
            أوافق بصفتي طالباً أو موظفاً في جامعة النجاح الوطنية على تسجيل بياناتي للأغراض الموضحة أعلاه طوعاً وبملء إرادتي.
          </span>
        </label>
        {fieldErrors.consentGiven && (
          <p className="text-xs text-[#002B49] font-medium mt-2">
            {fieldErrors.consentGiven[0]}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 px-6 rounded-xl font-bold text-white bg-[#002B49] hover:bg-[#002B49]/90 disabled:opacity-60 transition shadow-sm flex items-center justify-center gap-2 text-base cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري حفظ البيانات بأمان...
          </>
        ) : (
          'إرسال وإتمام التسجيل المسبق'
        )}
      </button>

      <p className="text-center text-[11px] text-[#475569] mt-3">
        تضمن جامعة النجاح الوطنية حماية وسرية بياناتكم وعدم مشاركتها مع أي جهة خارج النطاق المعتمد للحملة.
      </p>
    </form>
  );
}
