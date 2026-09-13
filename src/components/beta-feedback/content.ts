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
  en: 'Finish the feedback to help us make your results even more useful.',
  ar: 'أكمل التقييم لمساعدتنا في جعل نتائجك أكثر فائدة.',
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

const ACCURACY: Option[] = [
  { value: 'spot_on', label: { en: 'Spot on', ar: 'دقيق تمامًا' } },
  { value: 'mostly_right', label: { en: 'Mostly right', ar: 'صحيح إلى حدٍّ كبير' } },
  { value: 'off', label: { en: 'Off', ar: 'غير دقيق' } },
]

// ---------------------------------------------------------------------------
// Result Stage — shown on the results page itself (not gating, not the
// loading screen). Sits between Stage 1 (pulse, while the report generates)
// and Stage 2 (the full survey) — three questions asked right after someone
// has actually seen their report: accuracy, would-recommend, would-pay.
// would_recommend/would_pay are the same beta_feedback columns Section F below
// also asks about — intentionally duplicated (not exclusive to either stage)
// so it's still askable/editable there if someone skips or changes their mind.
// ---------------------------------------------------------------------------

export const resultStageIntro: Bi = {
  en: 'Quick check before you go:',
  ar: 'سؤال سريع قبل أن تُكمل:',
}

export const resultStageQuestions: { key: 'result_accuracy' | 'would_recommend' | 'would_pay'; label: Bi; options: Option[] }[] = [
  {
    key: 'result_accuracy',
    label: { en: 'How accurate was this?', ar: 'ما مدى دقة هذا التقرير؟' },
    options: ACCURACY,
  },
  {
    key: 'would_recommend',
    label: { en: 'Would you recommend this to a friend?', ar: 'هل توصي به صديقًا؟' },
    options: [
      { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
      { value: 'maybe', label: { en: 'Maybe', ar: 'ربما' } },
      { value: 'no', label: { en: 'No', ar: 'لا' } },
    ],
  },
  {
    key: 'would_pay',
    label: { en: 'Would you pay for this?', ar: 'هل ستدفع مقابل هذا؟' },
    options: [
      { value: 'definitely', label: { en: 'Definitely', ar: 'بالتأكيد' } },
      { value: 'maybe', label: { en: 'Maybe', ar: 'ربما' } },
      { value: 'no', label: { en: 'No', ar: 'لا' } },
    ],
  },
]

export const resultStageNoteLabel: Bi = {
  en: 'Is there anything you want to tell us? (optional)',
  ar: 'هل هناك أي شيء تود إخبارنا به؟ (اختياري)',
}

// Placeholder — final price / Founding Members offer is TBD per the
// beta-strategy doc §7 (Dina decides by 16 Oct after Beta 2's 99 vs 149 SAR
// test). Update this one constant once a price is set.
export const STAGE2_REPORT_PRICE_SAR = 129

const REPORT_SECTION_OPTIONS: Option[] = [
  { value: 'personality', label: { en: 'Personality profile', ar: 'ملف الشخصية' } },
  { value: 'values', label: { en: 'Values', ar: 'القيم' } },
  { value: 'strengths', label: { en: 'Strengths', ar: 'نقاط القوة' } },
  { value: 'careers', label: { en: 'Career matches', ar: 'المسارات المهنية' } },
  { value: 'ai_impact', label: { en: 'AI Impact', ar: 'تأثير الذكاء الاصطناعي' } },
  { value: 'jobs', label: { en: 'Job listings', ar: 'الوظائف المعروضة' } },
  { value: 'companies', label: { en: 'Target companies', ar: 'الشركات المقترحة' } },
  { value: 'courses', label: { en: 'Courses', ar: 'الدورات' } },
  { value: 'plan', label: { en: '90-day plan', ar: 'خطة الـ ٩٠ يومًا' } },
]

const PAY_BLOCKER_OPTIONS: Option[] = [
  { value: 'careers_dont_fit', label: { en: "The suggested careers don't feel right for me", ar: 'المسارات المقترحة لا تبدو مناسبة لي' } },
  { value: 'free_results_enough', label: { en: 'The complimentary results already give me enough', ar: 'النتائج المجانية تكفيني بالفعل' } },
  { value: 'not_sure_next_step', label: { en: "I'm still not sure what to do next", ar: 'ما زلت غير متأكد من خطوتي التالية' } },
  { value: 'doesnt_reflect_situation', label: { en: "It doesn't reflect my situation (e.g. student, or years of experience)", ar: 'لا يعكس وضعي (مثل كوني طالبًا، أو عدد سنوات خبرتي)' } },
  { value: 'want_coach_first', label: { en: "I'd want to speak with a real coach first", ar: 'أرغب في التحدث مع مدرّب حقيقي أولاً' } },
  { value: 'price_higher_than_expected', label: { en: "The price is higher than I'd expect", ar: 'السعر أعلى مما توقعت' } },
  { value: 'dont_usually_pay', label: { en: "I don't usually pay for career tools", ar: 'لا أدفع عادةً مقابل أدوات مهنية' } },
  { value: 'someone_else_decides', label: { en: 'Someone else would decide this (e.g. a parent)', ar: 'شخص آخر هو من سيقرر (مثل أحد الوالدين)' } },
  { value: 'dont_need_guidance_now', label: { en: "I don't need career guidance right now", ar: 'لا أحتاج إلى إرشاد مهني الآن' } },
  { value: 'other', label: { en: 'Other', ar: 'أخرى' } },
]

export const stage2Sections: SectionDef[] = [
  {
    id: 'B',
    heading: { en: 'Your report', ar: 'تقريرك' },
    fields: [
      {
        key: 'understood_after', type: 'face5', required: true,
        label: { en: 'How well did the report understand you?', ar: 'إلى أي مدى فهمك التقرير؟' },
        note: { en: 'mirrors Stage 1 Q3', ar: 'يقابل السؤال ٣ في المرحلة الأولى' },
      },
      {
        key: 'felt_like_mentor', type: 'single', required: true,
        label: { en: 'Did it feel like a coach who understands your situation, or a generic quiz?', ar: 'هل شعرت أنه مدرّب يفهم وضعك، أم اختبار عام؟' },
        options: [
          { value: 'mentor', label: { en: 'Like a coach who understands me', ar: 'كمدرّب يفهمني' } },
          { value: 'mixed', label: { en: 'Somewhere in between', ar: 'بين الاثنين' } },
          { value: 'generic', label: { en: 'Like a generic quiz', ar: 'كاختبار عام' } },
        ],
      },
      {
        key: 'careers_seriously_considered', type: 'single', required: true,
        label: { en: 'How many of these careers would you seriously consider?', ar: 'كم عدد هذه المسارات التي قد تفكر فيها جديًا؟' },
        options: [
          { value: 'none', label: { en: 'None', ar: 'لا شيء منها' } },
          { value: 'one', label: { en: '1', ar: '١' } },
          { value: 'a_few', label: { en: '2–3', ar: '٢-٣' } },
          { value: 'four_or_five', label: { en: '4–5', ar: '٤-٥' } },
        ],
      },
      {
        key: 'career_explained', type: 'single', required: true,
        label: { en: 'Did you understand why each career was suggested?', ar: 'هل فهمت سبب اقتراح كل مسار مهني؟' },
        options: [
          { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
          { value: 'partly', label: { en: 'Partly', ar: 'جزئيًا' } },
          { value: 'no', label: { en: 'No', ar: 'لا' } },
        ],
      },
    ],
  },
  {
    id: 'C',
    heading: { en: 'What stood out', ar: 'ما الذي لفت انتباهك' },
    fields: [
      {
        key: 'most_useful_part', type: 'single', required: true, options: REPORT_SECTION_OPTIONS,
        label: { en: 'Which part was most useful to you?', ar: 'أي جزء كان الأكثر فائدة لك؟' },
      },
      {
        key: 'least_useful_part', type: 'single', required: true, options: REPORT_SECTION_OPTIONS,
        label: { en: 'Which part was least useful to you?', ar: 'أي جزء كان الأقل فائدة لك؟' },
      },
      {
        key: 'first_action_text', type: 'text',
        label: { en: "What's the first thing you'll do after reading this? (optional)", ar: 'ما أول شيء ستفعله بعد قراءة هذا؟ (اختياري)' },
      },
    ],
  },
  {
    id: 'F',
    heading: { en: 'Value & pricing', ar: 'القيمة والسعر' },
    fields: [
      {
        key: 'would_pay_at_price', type: 'single', required: true,
        label: {
          en: `The full report is ${STAGE2_REPORT_PRICE_SAR} SAR, one time. Would you buy it?`,
          ar: `التقرير الكامل بسعر ${STAGE2_REPORT_PRICE_SAR} ريال سعودي، لمرة واحدة. هل ستشتريه؟`,
        },
        options: [
          { value: 'yes_today', label: { en: 'Yes, today', ar: 'نعم، اليوم' } },
          { value: 'yes_if_cheaper', label: { en: 'Yes, if cheaper', ar: 'نعم، إذا كان أرخص' } },
          { value: 'maybe_later', label: { en: 'Maybe later', ar: 'ربما لاحقًا' } },
          { value: 'no', label: { en: 'No', ar: 'لا' } },
        ],
      },
      {
        key: 'pay_blockers', type: 'multi', required: true, options: PAY_BLOCKER_OPTIONS,
        label: { en: 'What, if anything, would stop you from buying it today?', ar: 'ما الذي قد يمنعك من شرائه اليوم، إن وُجد؟' },
        showIf: (a) => !!a.would_pay_at_price && a.would_pay_at_price !== 'yes_today',
      },
      {
        key: 'pay_blocker_other_text', type: 'text',
        label: { en: 'You said "Other" — what did you mean?', ar: 'ذكرت «أخرى» — ماذا كنت تقصد؟' },
        showIf: (a) => Array.isArray(a.pay_blockers) && a.pay_blockers.includes('other'),
      },
      {
        key: 'pay_blocker_priority', type: 'single', required: true, options: PAY_BLOCKER_OPTIONS,
        label: { en: 'Which of these matters most?', ar: 'أي من هذه الأمور هو الأهم؟' },
        showIf: (a) => Array.isArray(a.pay_blockers) && a.pay_blockers.length > 0,
      },
      {
        key: 'worth_paying_for', type: 'multi', required: true,
        label: { en: 'What would make it worth paying for?', ar: 'ما الذي قد يجعله يستحق الدفع مقابله؟' },
        options: [
          { value: 'plan_for_stage', label: { en: 'A plan for my stage', ar: 'خطة مناسبة لمرحلتي' } },
          { value: 'internships_jobs', label: { en: 'Internships or jobs in my country', ar: 'فرص تدريب أو وظائف في بلدي' } },
          { value: 'certifications', label: { en: 'Certifications to pursue', ar: 'شهادات يمكنني الحصول عليها' } },
          { value: 'coach_session', label: { en: 'A session with a coach', ar: 'جلسة مع مدرّب' } },
          { value: 'deeper_ai_outlook', label: { en: 'Deeper AI outlook for my career', ar: 'نظرة أعمق حول تأثير الذكاء الاصطناعي على مساري' } },
          { value: 'shareable_report', label: { en: 'A report I can share with my family', ar: 'تقرير يمكنني مشاركته مع عائلتي' } },
          { value: 'other', label: { en: 'Other', ar: 'أخرى' } },
        ],
      },
      {
        key: 'wants_coach_session', type: 'single', required: true,
        label: { en: 'Would a session with a career coach to go through your results be useful?', ar: 'هل ستكون جلسة مع مدرّب مهني لمراجعة نتائجك مفيدة؟' },
        options: [
          { value: 'yes_pay', label: { en: "Yes, I'd pay for it", ar: 'نعم، سأدفع مقابلها' } },
          { value: 'if_included', label: { en: 'Only if included', ar: 'فقط إذا كانت مُدرجة' } },
          { value: 'no', label: { en: 'No', ar: 'لا' } },
        ],
      },
      {
        key: 'would_recommend', type: 'single', required: true,
        label: { en: 'Would you recommend Etijahi to a friend?', ar: 'هل توصي بإتجاهي لصديق؟' },
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
]
