'use client'

// Small "i" info trigger for QO5 (field of study/work) — opens a card listing
// example majors under each broad field, so someone doesn't have to guess
// whether e.g. "Accounting" falls under Business before picking it.

import { useState } from 'react'

interface Bi { en: string; ar: string }

const title: Bi = { en: 'What falls under each field?', ar: 'ما الذي يندرج تحت كل مجال؟' }
const closeLabel: Bi = { en: 'Close', ar: 'إغلاق' }
const triggerLabel: Bi = { en: 'What falls under these?', ar: 'ما الذي يندرج تحت هذه المجالات؟' }

// Keyed by the same option values as QO5 in src/data/questions.ts.
// Not an exhaustive list — just enough common majors to anchor the category.
const FIELD_EXAMPLES: Record<string, Bi> = {
  business: {
    en: 'Accounting, Marketing, Management, Finance, Economics, Human Resources, Business Administration',
    ar: 'المحاسبة، التسويق، الإدارة، التمويل، الاقتصاد، الموارد البشرية، إدارة الأعمال',
  },
  engineering: {
    en: 'Mechanical, Civil, Electrical, Chemical, Industrial, Petroleum, Computer Engineering',
    ar: 'الهندسة الميكانيكية، المدنية، الكهربائية، الكيميائية، الصناعية، البترول، هندسة الحاسوب',
  },
  computer_science: {
    en: 'Computer Science, Software Engineering, Information Technology, Data Science, Cybersecurity, AI',
    ar: 'علوم الحاسوب، هندسة البرمجيات، تقنية المعلومات، علم البيانات، الأمن السيبراني، الذكاء الاصطناعي',
  },
  medicine: {
    en: 'Medicine, Dentistry, Pharmacy, Nursing, Public Health, Physical Therapy',
    ar: 'الطب، طب الأسنان، الصيدلة، التمريض، الصحة العامة، العلاج الطبيعي',
  },
  sciences: {
    en: 'Biology, Chemistry, Physics, Mathematics, Environmental Science, Geology',
    ar: 'الأحياء، الكيمياء، الفيزياء، الرياضيات، علوم البيئة، الجيولوجيا',
  },
  humanities: {
    en: 'History, Philosophy, Psychology, Sociology, Political Science, Languages & Literature',
    ar: 'التاريخ، الفلسفة، علم النفس، علم الاجتماع، العلوم السياسية، اللغات والآداب',
  },
  arts: {
    en: 'Fine Arts, Graphic Design, Music, Theatre, Film & Media, Architecture (design)',
    ar: 'الفنون الجميلة، التصميم الجرافيكي، الموسيقى، المسرح، السينما والإعلام، العمارة (التصميم)',
  },
  education: {
    en: 'Education, Early Childhood Education, Teaching, Curriculum & Instruction',
    ar: 'التربية، تربية الطفولة المبكرة، التدريس، المناهج وطرق التدريس',
  },
  law: {
    en: 'Law, Sharia/Islamic Law, International Law, Legal Studies',
    ar: 'القانون، الشريعة الإسلامية، القانون الدولي، الدراسات القانونية',
  },
}

function t(bi: Bi, locale: 'en' | 'ar'): string {
  return locale === 'ar' ? bi.ar : bi.en
}

interface Props {
  locale: 'en' | 'ar'
  /** option value -> display label, in question order (skips values with no examples, e.g. "not_applicable") */
  optionLabels: { value: string; label: string }[]
}

export default function FieldOfStudyInfo({ locale, optionLabels }: Props) {
  const [open, setOpen] = useState(false)
  const rows = optionLabels.filter(o => FIELD_EXAMPLES[o.value])

  return (
    <>
      <button type="button" className="fieldinfo-trigger" onClick={() => setOpen(true)}>
        <span className="fieldinfo-icon">i</span>
        {t(triggerLabel, locale)}
      </button>
      {open && (
        <div className="bugreport-overlay" onClick={() => setOpen(false)}>
          <div className="bugreport-card fieldinfo-card" onClick={e => e.stopPropagation()} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <h3>{t(title, locale)}</h3>
            <div className="fieldinfo-list">
              {rows.map(({ value, label }) => (
                <div key={value} className="fieldinfo-row">
                  <div className="fieldinfo-row-title">{label}</div>
                  <div className="fieldinfo-row-examples">{t(FIELD_EXAMPLES[value], locale)}</div>
                </div>
              ))}
            </div>
            <div className="bugreport-actions">
              <button type="button" className="bugreport-btn-primary" onClick={() => setOpen(false)}>{t(closeLabel, locale)}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
