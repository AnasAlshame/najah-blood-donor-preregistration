'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BLOOD_TYPES,
  CAMPUSES,
  GOVERNORATES,
  AVAILABILITY_STATUSES,
  GENDER_OPTIONS,
} from '@/types/donor';
import { OFFICIAL_CONSENT_TEXT } from '@/lib/validation';
import {
  AlertCircle,
  ShieldCheck,
  Phone,
  User,
  Heart,
  Calendar,
  MapPin,
  Loader2,
} from 'lucide-react';

export default function RegistrationForm() {
  const router = useRouter();

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
    detailedAddress: '',
    availabilityStatus: AVAILABILITY_STATUSES[0],
    lastDonationDate: '',
    healthDisclosure: '',
    consentGiven: false,
    honeypot: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

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
          detailedAddress: formData.detailedAddress || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMsg(data.error || 'تعذر إتمام التسجيل. يرجى مراجعة البيانات.');
        if (data.details) {
          setFieldErrors(data.details);
        }
      } else {
        // Redirect to clean success confirmation page
        router.push('/success');
      }
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  };

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
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]"
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
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] font-mono ltr-content"
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
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
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
              رقم الهاتف المحمول <span className="text-[#002B49] font-bold">*</span>
            </label>
            <input
              type="tel"
              name="phoneNumber"
              required
              placeholder="+970599123456 أو +972568123456"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8] font-mono ltr-content"
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
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-mono ltr-content"
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
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
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
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] font-semibold"
            >
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {bt === 'UNKNOWN' ? 'غير متأكد / لا أعلم بالتحديد' : bt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              حالة الاستعداد الحالية للتواصل <span className="text-[#002B49] font-bold">*</span>
            </label>
            <select
              name="availabilityStatus"
              value={formData.availabilityStatus}
              onChange={handleChange}
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
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
            <div className="relative">
              <input
                type="date"
                name="lastDonationDate"
                value={formData.lastDonationDate}
                onChange={handleChange}
                max={new Date().toISOString().split('T')[0]}
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] ltr-content cursor-pointer"
              />
            </div>
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
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]"
            />
          </div>
        </div>
      </div>

      {/* 4. Geographic Location & Detailed Address */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E2E8F0]">
          <MapPin className="w-5 h-5 text-[#002B49]" />
          <h3 className="text-base font-bold text-[#002B49]">
            مكان السكن والإقامة للتنسيق الجغرافي
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
              المحافظة <span className="text-[#002B49] font-bold">*</span>
            </label>
            <select
              name="governorate"
              value={formData.governorate}
              onChange={handleChange}
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A]"
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
              placeholder="مثال: نابلس، رفيديا، عصيرة..."
              value={formData.cityOrVillage}
              onChange={handleChange}
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]"
            />
            {fieldErrors.cityOrVillage && (
              <p className="text-xs text-[#002B49] font-medium mt-1">
                {fieldErrors.cityOrVillage[0]}
              </p>
            )}
          </div>
        </div>

        {/* Detailed Address Field */}
        <div>
          <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
            العنوان بالتفصيل (اسم الشارع، اسم البناية، رقم الشقة / الطابق)
          </label>
          <input
            type="text"
            name="detailedAddress"
            placeholder="مثال: شارع الجامعة، عمارة القدس، الطابق الثالث، شقة رقم 6..."
            value={formData.detailedAddress}
            onChange={handleChange}
            className="w-full h-11 px-3.5 text-sm rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] placeholder-[#94A3B8]"
          />
          {fieldErrors.detailedAddress && (
            <p className="text-xs text-[#002B49] font-medium mt-1">
              {fieldErrors.detailedAddress[0]}
            </p>
          )}
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
