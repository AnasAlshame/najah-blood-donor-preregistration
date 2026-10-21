import { z } from 'zod';
import {
  BLOOD_TYPES,
  CAMPUSES,
  GOVERNORATES,
  AVAILABILITY_STATUSES,
  GENDER_OPTIONS,
} from '@/types/donor';

/**
 * Normalizes Palestinian and common regional mobile phone numbers.
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+970')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('+972')) {
    cleaned = '0' + cleaned.substring(4);
  } else if (cleaned.startsWith('00970')) {
    cleaned = '0' + cleaned.substring(5);
  } else if (cleaned.startsWith('00972')) {
    cleaned = '0' + cleaned.substring(5);
  }

  return cleaned;
}

export function isValidPalestinianPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^(059|056)\d{7}$/.test(normalized);
}

export const CURRENT_CONSENT_VERSION = 'v1.0-2026';
export const OFFICIAL_CONSENT_TEXT = `أقر بموافقتي الصريحة والواعية على تسجيل بياناتي ضمن الحملة الرسمية للتسجيل المسبق للمتبرعين بالدم التابعة لجامعة النجاح الوطنية. 
أفهم أن هذه البيانات ستُستخدم حصراً للتواصل معي لغايات التبرع بالدم عند الحاجة، وأن هذا التسجيل طوعي ولا يشكل بأي حال من الأحوال تقييماً أو إثباتاً للأهلية الطبية السريرية للتبرع، 
حيث يخضع التبرع الفعلي للفحص الطبي المعتمد في حينه وفق المعايير الصحية الرسمية.`;

export const donorRegistrationSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, { message: 'يرجى كتابة الاسم الرباعي كاملاً (3 أحرف على الأقل)' })
    .max(100, { message: 'الاسم طويل جداً (الحد الأقصى 100 حرف)' })
    .regex(/^[\u0621-\u064A\s\w\-]+$/, {
      message: 'يرجى إدخال اسم لائق يحتوي على أحرف صحيحة',
    }),

  universityId: z
    .string({ message: 'الرقم الجامعي مطلوب' })
    .trim()
    .regex(/^\d{8}$/, {
      message: 'الرقم الجامعي يجب أن يتكون من 8 أرقام فقط (ممنوع أكثر أو أقل)',
    }),

  universityEmail: z
    .string({ message: 'البريد الإلكتروني الجامعي مطلوب' })
    .trim()
    .toLowerCase()
    .regex(/^s[0-9]+@stu\.najah\.edu$/, {
      message: 'يجب إدخال بريد جامعي رسمي يبدأ بحرف s متبوعاً بالرقم الجامعي (مثال: s12323975@stu.najah.edu)',
    }),

  campus: z.enum(CAMPUSES, {
    message: 'يرجى اختيار موقع الحرم الجامعي من القائمة المعتمدة',
  }),

  phoneNumber: z
    .string()
    .trim()
    .refine((val) => isValidPalestinianPhone(val), {
      message: 'يرجى إدخال رقم جوال فلسطيني صحيح (مثال: +970599123456 أو 0599123456)',
    }),

  age: z
    .coerce
    .number({ message: 'يرجى إدخال العمر كعدد صحيح' })
    .int({ message: 'العمر يجب أن يكون رقماً صحيحاً' })
    .min(16, { message: 'يجب أن يكون العمر 16 عاماً على الأقل' })
    .max(75, { message: 'يرجى التأكد من صحة العمر المدخل' }),

  gender: z.enum(GENDER_OPTIONS, {
    message: 'يرجى تحديد الجنس',
  }),

  bloodType: z.enum(BLOOD_TYPES, {
    message: 'يرجى اختيار زمرة الدم، أو اختر "غير متأكد"',
  }),

  governorate: z.enum(GOVERNORATES, {
    message: 'يرجى اختيار المحافظة من القائمة',
  }),

  cityOrVillage: z
    .string()
    .trim()
    .min(2, { message: 'يرجى إدخال المدينة أو البلدة أو القرية' })
    .max(100, { message: 'اسم المنطقة طويل جداً' }),

  detailedAddress: z
    .string({ message: 'يرجى إدخال تفاصيل العنوان' })
    .trim()
    .min(3, { message: 'يرجى إدخال تفاصيل العنوان (الشارع، البناية، رقم الشقة)' })
    .max(300, { message: 'تفاصيل العنوان طويلة جداً' }),

  availabilityStatus: z.enum(AVAILABILITY_STATUSES, {
    message: 'يرجى اختيار حالة الاستعداد للتواصل',
  }),

  lastDonationDate: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        const now = new Date();
        return !isNaN(date.getTime()) && date <= now;
      },
      { message: 'تاريخ آخر تبرع لا يمكن أن يكون في المستقبل' }
    ),

  healthDisclosure: z
    .string()
    .trim()
    .max(5000, { message: 'الملاحظة الصحية لا تتجاوز 5000 حرف' })
    .optional()
    .nullable(),

  consentGiven: z.literal(true, {
    message: 'يجب قراءة إقرار الخصوصية والموافقة الصريحة عليه لإتمام التسجيل',
  }),

  honeypot: z.string().max(0, { message: 'Spam detected' }).optional(),
});
