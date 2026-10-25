// Sample reports shown in the "View a sample report" popup. One per report
// scenario (see etijah-career-platform-backend/scripts/generate_demo_report_scenarios.py,
// which writes public/demo-reports/<key>-<en|ar>.pdf — keep the keys in sync).
// "general" is the original single sample (public/demo-report-<locale>.pdf).
export type DemoReportKey =
  | 'free' | 'general' | 'school_majors' | 'university_student' | 'recent_graduate'
  | 'stay_in_field' | 'change_field' | 'not_sure'

export const DEMO_REPORTS: {
  key: DemoReportKey
  title: { en: string; ar: string }
  body: { en: string; ar: string }
}[] = [
  // the free report is the two-page snapshot (public/demo-reports/free-<en|ar>.pdf), built from the backend's free_snapshot_pdf.py
  { key: 'free',
    // title: { en: 'Free report', ar: 'التقرير المجاني' },
    // body: { en: 'What you get free: your interests, values, strengths and personality, in two pages.', ar: 'ما تحصل عليه مجاناً: اهتماماتك وقيمك ونقاط قوتك وشخصيتك، في صفحتين.' } },
    title: { en: 'Results preview', ar: 'معاينة النتائج' },
    body: { en: 'A first look at your results: your interests, in two pages.', ar: 'نظرة أولى على نتائجك: اهتماماتك، في صفحتين.' } },
  { key: 'general',
    title: { en: 'Full sample report', ar: 'نموذج التقرير الكامل' },
    body: { en: 'The complete report, every section.', ar: 'التقرير الكامل بكل أقسامه.' } },
  { key: 'school_majors',
    title: { en: 'Choosing a major', ar: 'اختيار التخصص' },
    body: { en: 'For school students deciding what to study.', ar: 'لطلاب المدارس الذين يختارون ما سيدرسونه.' } },
  { key: 'university_student',
    title: { en: 'University student', ar: 'طالب جامعي' },
    body: { en: 'For students exploring careers while still studying.', ar: 'للطلاب الذين يستكشفون المسارات المهنية أثناء الدراسة.' } },
  { key: 'recent_graduate',
    title: { en: 'Recent graduate', ar: 'خريج جديد' },
    body: { en: 'For graduates entering the job market.', ar: 'للخريجين الذين يدخلون سوق العمل.' } },
  { key: 'stay_in_field',
    title: { en: 'Staying in my field', ar: 'البقاء في مجالي' },
    body: { en: 'For professionals who want to grow where they are.', ar: 'للمهنيين الراغبين في التقدّم في مجالهم الحالي.' } },
  { key: 'change_field',
    title: { en: 'A new direction', ar: 'اتجاه جديد' },
    body: { en: 'For professionals ready to change fields.', ar: 'للمهنيين المستعدين لتغيير مجالهم.' } },
  { key: 'not_sure',
    title: { en: 'Not sure yet', ar: 'لست متأكدًا بعد' },
    body: { en: 'For people weighing staying against changing.', ar: 'لمن يوازن بين البقاء والتغيير.' } },
]

export function demoReportHref(key: DemoReportKey, locale: string): string {
  const l = locale === 'ar' ? 'ar' : 'en'
  return key === 'general' ? `/demo-report-${l}.pdf` : `/demo-reports/${key}-${l}.pdf`
}
