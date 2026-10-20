const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../data/najah_blood_donors.sqlite');

try {
  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare('SELECT * FROM donor_registrations ORDER BY created_at DESC').all();

  console.log('\n=============================================================');
  console.log(`إجمالي السجلات المسجلة في قاعدة البيانات: ${rows.length}`);
  console.log('=============================================================\n');

  if (rows.length === 0) {
    console.log('لم يتم تسجيل أي متبرع بعد. قم بتعبئة النموذج من هاتفك أو المتصفح وسيظهر هنا فوراً.');
  } else {
    console.table(rows.map(r => ({
      'الرقم المرجعي': r.id.substring(0, 8),
      'الاسم': r.full_name,
      'الرقم الجامعي': r.university_id,
      'الحرم': r.campus,
      'الجوال': r.phone_number,
      'الفصيلة': r.blood_type,
      'المدينة': r.city_or_village,
      'تاريخ التسجيل': r.created_at.substring(0, 19).replace('T', ' ')
    })));
  }
} catch (err) {
  console.log('قاعدة البيانات غير منشأة بعد أو لا تحتوي على بيانات حالياً.');
}
