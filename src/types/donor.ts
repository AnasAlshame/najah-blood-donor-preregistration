export const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'UNKNOWN',
] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];

export const CAMPUSES = [
  'الحرم الجديد (الأكاديمية)',
  'الحرم القديم',
  'كلية هشام حجاوي التكنولوجية',
  'فرع طولكرم (كلية الزراعة والطب البيطري)',
] as const;

export type Campus = (typeof CAMPUSES)[number];

export const GOVERNORATES = [
  'نابلس',
  'جنين',
  'طولكرم',
  'قلقيلية',
  'سلفيت',
  'طوباس',
  'رام الله والبيرة',
  'أريحا والأغوار',
  'القدس',
  'بيت لحم',
  'الخليل',
  'قطاع غزة',
] as const;

export type Governorate = (typeof GOVERNORATES)[number];

export const AVAILABILITY_STATUSES = [
  'AVAILABLE',
  'CURRENTLY_UNAVAILABLE',
  'RECENTLY_DONATED',
] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const GENDER_OPTIONS = [
  'ذكر',
  'أنثى',
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number];

export interface DonorRegistrationInput {
  fullName: string;
  universityId: string;
  campus: Campus;
  phoneNumber: string;
  age: number;
  gender: Gender;
  bloodType: BloodType;
  governorate: Governorate;
  cityOrVillage: string;
  detailedAddress: string;
  availabilityStatus: AvailabilityStatus;
  lastDonationDate?: string | null;
  healthDisclosure?: string | null;
  consentGiven: boolean;
  honeypot?: string;
}

export interface DonorRecord extends DonorRegistrationInput {
  id: string;
  bloodTypeVerification: 'SELF_REPORTED';
  registrationSource: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'MIGRATED';
  createdAt: string;
  updatedAt: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  referenceId?: string;
  error?: string;
  duplicate?: boolean;
}
