// Bilingual copy for the beta-tester feedback flow (Stage 1 pulse + Stage 2 full
// form). Beta-only, throwaway content used in exactly one place — kept as an
// inline object rather than added to messages/en.json & ar.json, following the
// precedent set by CHROME/ENCOURAGEMENT in AssessmentForm.tsx.

export type Locale = 'en' | 'ar'

export interface Bi { en: string; ar: string }

export const FACE_EMOJIS = ['😖', '😐', '🙂', '😀', '🤩']

// ---------------------------------------------------------------------------
// Stage 1 — pre-result pulse (loading screen, 3 taps, never blocks)
// ---------------------------------------------------------------------------

export const stage1Intro: Bi = {
  en: 'Building your report… while you wait, two quick taps: how was that?',
  ar: 'جارٍ إعداد تقريرك… وأنت تنتظر، سؤالان سريعان: كيف كانت التجربة؟',
}

export const stage1Questions: { key: 's1_clarity' | 's1_feeling' | 's1_understood'; label: Bi }[] = [
  { key: 's1_clarity', label: {
    en: 'The questions were clear and easy to follow.',
    ar: 'الأسئلة كانت واضحة وسهلة المتابعة.',
  } },
  { key: 's1_feeling', label: {
    en: 'How did taking the assessment feel overall?',
    ar: 'كيف كان شعورك أثناء إجراء التقييم بشكل عام؟',
  } },
  { key: 's1_understood', label: {
    en: 'How well do you think we understood you?',
    ar: 'إلى أي مدى تعتقد أننا فهمناك؟',
  } },
]

// ---------------------------------------------------------------------------
// Stage 2 — post-result full form
// ---------------------------------------------------------------------------

export const stage2Hook: Bi = {
  en: 'You just got the full report — free, before anyone else. Help us make it sharper for the next person. About 4 minutes.',
  ar: 'لقد حصلت على تقريرك الكامل — مجانًا، قبل أي شخص آخر. ساعدنا في جعله أدق لمن يأتي بعدك. حوالي ٤ دقائق.',
}

export const stage2ProgressCarry: Bi = {
  en: '2 quick answers already in — just one short form to go.',
  ar: 'سجّلنا إجابتين سريعتين منك بالفعل — بقي نموذج قصير واحد فقط.',
}

export const stage2CoCreator: Bi = {
  en: 'You’re one of our first 50 testers. The questions you flag as "off" get rewritten before launch.',
  ar: 'أنت من أوائل ٥٠ مشاركًا معنا. الأسئلة التي تشير إلى أنها «غير دقيقة» ستُعاد صياغتها قبل الإطلاق.',
}

export function personalHook(typeLabel: string, locale: Locale): string {
  return locale === 'ar'
    ? `ظهرت نتيجتك كـ «${typeLabel}» — ساعدنا الآن في بناء أداة أفضل.`
    : `You came out as "${typeLabel}" — now help us build a better tool.`
}

export const stage2Reward: Bi = {
  en: 'Finish the feedback and book a free 20-minute session with an Etijah coach to walk through your results.',
  ar: 'أكمل التقييم واحجز جلسة مجانية مدتها ٢٠ دقيقة مع مدرب من إتجاه لمراجعة نتائجك معك.',
}

export type FieldType = 'single' | 'scale6' | 'face5' | 'multi' | 'text'

export interface Option { value: string; label: Bi }

export interface FieldDef {
  key: string
  type: FieldType
  label: Bi
  note?: Bi
  required?: boolean
  options?: Option[]
  low?: Bi
  high?: Bi
  showIf?: (answers: Record<string, any>) => boolean
}

export interface SectionDef {
  id: string
  heading: Bi
  fields: FieldDef[]
}

const YES_SOMEWHAT_NO: Option[] = [
  { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
  { value: 'somewhat', label: { en: 'Somewhat', ar: 'إلى حدٍّ ما' } },
  { value: 'no', label: { en: 'No', ar: 'لا' } },
]

const ACCURACY: Option[] = [
  { value: 'spot_on', label: { en: 'Spot on', ar: 'دقيق تمامًا' } },
  { value: 'mostly_right', label: { en: 'Mostly right', ar: 'صحيح إلى حدٍّ كبير' } },
  { value: 'off', label: { en: 'Off', ar: 'غير دقيق' } },
]

export const stage2Sections: SectionDef[] = [
  {
    id: 'A',
    heading: { en: 'Language', ar: 'اللغة' },
    fields: [
      {
        key: 'language_used', type: 'single', required: true,
        label: { en: 'Which language did you use?', ar: 'ما اللغة التي استخدمتها؟' },
        options: [
          { value: 'en', label: { en: 'English', ar: 'الإنجليزية' } },
          { value: 'ar', label: { en: 'Arabic', ar: 'العربية' } },
          { value: 'both', label: { en: 'Both', ar: 'كلاهما' } },
        ],
      },
    ],
  },
  {
    id: 'B',
    heading: { en: 'Your report', ar: 'تقريرك' },
    fields: [
      {
        key: 'understood_after', type: 'face5', required: true,
        label: { en: 'Now that you’ve read it — how well did we actually understand you?', ar: 'بعد أن قرأت التقرير — إلى أي مدى فهمناك فعلًا؟' },
        note: { en: 'mirrors Stage 1 Q3', ar: 'يقابل السؤال ٣ في المرحلة الأولى' },
      },
      {
        key: 'personality_accuracy', type: 'single', required: true, options: ACCURACY,
        label: { en: 'Your personality type', ar: 'نمط شخصيتك' },
      },
      {
        key: 'values_accuracy', type: 'single', required: true, options: ACCURACY,
        label: { en: 'Your core values', ar: 'قيمك الأساسية' },
      },
      {
        key: 'strengths_accuracy', type: 'single', required: true, options: ACCURACY,
        label: { en: 'Your strengths', ar: 'نقاط قوتك' },
      },
      {
        key: 'career_matches_accuracy', type: 'single', required: true, options: ACCURACY,
        label: { en: 'Your suggested career matches', ar: 'المسارات المهنية المقترحة لك' },
      },
      {
        key: 'wrong_career_text', type: 'text',
        label: { en: 'Was any suggested career clearly wrong for you? Which one, and why?', ar: 'هل كان أي مسار مقترح غير مناسب لك بوضوح؟ أيّها، ولماذا؟' },
      },
      {
        key: 'missing_career_text', type: 'text',
        label: { en: 'Any career you expected to see that was missing?', ar: 'هل هناك مسار توقعت رؤيته ولم يظهر؟' },
      },
    ],
  },
  {
    id: 'C',
    heading: { en: 'The deeper report', ar: 'الأجزاء المتقدمة من التقرير' },
    fields: [
      {
        key: 'ai_impact_useful', type: 'scale6', required: true,
        label: { en: 'AI Impact & Future-Proofing section — was it useful?', ar: 'قسم «تأثير الذكاء الاصطناعي ومستقبل المهنة» — هل كان مفيدًا؟' },
        low: { en: 'Not useful', ar: 'غير مفيد' }, high: { en: 'Very useful', ar: 'مفيد جدًا' },
      },
      {
        key: 'ai_impact_credible', type: 'scale6', required: true,
        label: { en: 'AI Impact section — did it feel believable and credible?', ar: 'قسم تأثير الذكاء الاصطناعي — هل بدا مقنعًا وموثوقًا؟' },
        low: { en: 'Not credible', ar: 'غير موثوق' }, high: { en: 'Very credible', ar: 'موثوق جدًا' },
      },
      {
        key: 'ai_impact_changed_thinking', type: 'single', required: true, options: YES_SOMEWHAT_NO,
        label: { en: 'AI Impact section — did it change how you think about your direction?', ar: 'قسم تأثير الذكاء الاصطناعي — هل غيّر طريقة تفكيرك في مسارك؟' },
      },
      {
        key: 'jobs_relevant', type: 'scale6', required: true,
        label: { en: 'The job listings — were they relevant to you?', ar: 'الوظائف المعروضة — هل كانت ذات صلة بك؟' },
        low: { en: 'Not relevant', ar: 'غير ذات صلة' }, high: { en: 'Very relevant', ar: 'ذات صلة كبيرة' },
      },
      {
        key: 'companies_fit', type: 'scale6', required: true,
        label: { en: 'The companies to target — were they the right fit for you?', ar: 'الشركات المقترحة للتقديم — هل كانت مناسبة لك؟' },
        low: { en: 'Not a fit', ar: 'غير مناسبة' }, high: { en: 'Great fit', ar: 'مناسبة جدًا' },
      },
      {
        key: 'courses_useful', type: 'scale6', required: true,
        label: { en: 'The recommended courses — were they useful?', ar: 'الدورات الموصى بها — هل كانت مفيدة؟' },
        low: { en: 'Not useful', ar: 'غير مفيدة' }, high: { en: 'Very useful', ar: 'مفيدة جدًا' },
      },
    ],
  },
  {
    id: 'D',
    heading: { en: 'Actionability', ar: 'قابلية التنفيذ' },
    fields: [
      {
        key: 'plan_would_follow', type: 'single', required: true, options: YES_SOMEWHAT_NO,
        label: { en: 'The 90-Day Action Plan — is it something you would actually follow?', ar: 'خطة الـ ٩٠ يومًا — هل هي شيء ستتّبعه فعلًا؟' },
      },
      {
        key: 'clear_next_step', type: 'single', required: true, options: YES_SOMEWHAT_NO,
        label: { en: 'Did you leave with a clear next step?', ar: 'هل خرجت بخطوة تالية واضحة؟' },
      },
    ],
  },
  {
    id: 'E',
    heading: { en: 'Coaching voice & culture', ar: 'الصوت الإرشادي والسياق الثقافي' },
    fields: [
      {
        key: 'arabic_natural', type: 'single', required: true,
        label: { en: 'Did the Arabic read naturally, or like translated English?', ar: 'هل كانت اللغة العربية طبيعية، أم بدت وكأنها ترجمة حرفية؟' },
        options: [
          { value: 'natural', label: { en: 'Natural', ar: 'طبيعية' } },
          { value: 'mixed', label: { en: 'Mixed', ar: 'متوسطة' } },
          { value: 'translated', label: { en: 'Feels translated', ar: 'تبدو مترجمة' } },
        ],
        showIf: (a) => a.language_used === 'ar',
      },
    ],
  },
  {
    id: 'F',
    heading: { en: 'Value', ar: 'القيمة' },
    fields: [
      {
        key: 'overall_value', type: 'scale6', required: true,
        label: { en: 'Overall, how valuable was this for making a real career decision?', ar: 'بشكل عام، ما مدى فائدة هذا التقرير في اتخاذ قرار مهني حقيقي؟' },
        low: { en: 'Not valuable', ar: 'غير مفيد' }, high: { en: 'Extremely valuable', ar: 'مفيد للغاية' },
      },
      {
        key: 'most_valuable_parts', type: 'multi',
        label: { en: 'Which parts were most valuable to you?', ar: 'أي الأجزاء كانت الأكثر قيمة بالنسبة لك؟' },
        options: [
          { value: 'personality', label: { en: 'Personality profile', ar: 'ملف الشخصية' } },
          { value: 'values', label: { en: 'Values', ar: 'القيم' } },
          { value: 'strengths', label: { en: 'Strengths', ar: 'نقاط القوة' } },
          { value: 'careers', label: { en: 'Career matches', ar: 'المسارات المهنية' } },
          { value: 'ai_impact', label: { en: 'AI Impact', ar: 'تأثير الذكاء الاصطناعي' } },
          { value: 'jobs', label: { en: 'Job listings', ar: 'الوظائف المعروضة' } },
          { value: 'companies', label: { en: 'Target companies', ar: 'الشركات المقترحة' } },
          { value: 'courses', label: { en: 'Courses', ar: 'الدورات' } },
          { value: 'plan', label: { en: '90-day plan', ar: 'خطة الـ ٩٠ يومًا' } },
        ],
      },
      {
        key: 'would_pay', type: 'single', required: true,
        label: { en: 'If the full report you just saw were a paid product, would it be worth it?', ar: 'لو كان التقرير الكامل الذي رأيته للتو منتجًا مدفوعًا، فهل يستحق ذلك؟' },
        options: [
          { value: 'definitely', label: { en: 'Definitely', ar: 'بالتأكيد' } },
          { value: 'maybe', label: { en: 'Maybe', ar: 'ربما' } },
          { value: 'no', label: { en: 'No', ar: 'لا' } },
        ],
      },
      {
        key: 'would_recommend', type: 'single', required: true,
        label: { en: 'Would you recommend this to a friend?', ar: 'هل توصي به صديقًا؟' },
        options: [
          { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
          { value: 'maybe', label: { en: 'Maybe', ar: 'ربما' } },
          { value: 'no', label: { en: 'No', ar: 'لا' } },
        ],
      },
    ],
  },
  {
    id: 'G',
    heading: { en: 'Anything broken?', ar: 'هل واجهت أي مشكلة؟' },
    fields: [
      {
        key: 'device', type: 'single', required: true,
        label: { en: 'Which device did you use?', ar: 'ما الجهاز الذي استخدمته؟' },
        options: [
          { value: 'mobile', label: { en: 'Mobile', ar: 'جوال' } },
          { value: 'desktop', label: { en: 'Desktop', ar: 'حاسوب' } },
        ],
      },
      {
        key: 'had_issues', type: 'single', required: true,
        label: { en: 'Did you hit any errors, glitches, or confusing moments?', ar: 'هل واجهت أي أخطاء أو مشاكل تقنية أو لحظات مربكة؟' },
        options: [
          { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
          { value: 'no', label: { en: 'No', ar: 'لا' } },
        ],
      },
      {
        key: 'issue_detail', type: 'text',
        label: { en: 'If yes — what happened?', ar: 'إذا كانت الإجابة نعم — ماذا حدث؟' },
        showIf: (a) => a.had_issues === 'yes',
      },
    ],
  },
  {
    id: 'H',
    heading: { en: 'Open reflections', ar: 'انطباعات ختامية' },
    fields: [
      {
        key: 'surprised_text', type: 'text',
        label: { en: 'What surprised you most?', ar: 'ما الذي فاجأك أكثر؟' },
      },
      {
        key: 'not_me_text', type: 'text',
        label: { en: 'Was there anything that felt "that’s not me"?', ar: 'هل كان هناك شيء شعرت أنه «لا يمثّلني»؟' },
      },
      {
        key: 'other_text', type: 'text',
        label: { en: 'Anything else you’d like to tell us?', ar: 'أي شيء آخر تود إخبارنا به؟' },
      },
    ],
  },
]
