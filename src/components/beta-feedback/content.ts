// Bilingual copy for the launch feedback flow, from the 7 Oct 2026 "Launch Feedback Questions"
// doc. Three stages, nobody sees more than 12 questions in one sitting:
//   Stage 1  loading screen        Q1-Q4    everyone        (coach, one tap each)
//   Stage 2  results page          Q5-Q8    everyone        (coach, Q8 optional text)
//   Stage 3A follow-up, free       Q9-Q17   free users      (7 + 2 only if they have not bought)
//   Stage 3B follow-up, paid       Q9-Q23   paid users      (12)
// Question numbers follow the doc. Kept as an inline object rather than messages/en.json & ar.json,
// following the precedent set by CHROME/ENCOURAGEMENT in AssessmentForm.tsx.

export type Locale = 'en' | 'ar'

export interface Bi { en: string; ar: string }

export const FACE_EMOJIS = ['😖', '😐', '🙂', '😀', '🤩']

// Stamped onto every submission so the admin dashboard can tell launch answers from beta answers
// (beta rows carry v1 / v1 / v4 and form_version = 'beta'). Bump when a question or option changes.
export const STAGE1_FORM_VERSION = 'v4_launch'
export const RESULT_STAGE_FORM_VERSION = 'v4_launch'
export const STAGE2_FORM_VERSION = 'v4_launch'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type FieldType = 'single' | 'scale6' | 'face5' | 'multi' | 'text'

export interface Option { value: string; label: Bi }

// What the follow-up form knows about the reader, from GET /beta-feedback/{id}/context.
export interface FollowUpContext {
  planTier: 'free' | 'paid'
  reportLocale: Locale
  openedAiImpact: boolean
}

export interface FieldDef {
  key: string
  type: FieldType
  label: Bi
  note?: Bi
  required?: boolean
  options?: Option[]
  low?: Bi
  high?: Bi
  showIf?: (answers: Record<string, any>, ctx: FollowUpContext) => boolean
}

export interface SectionDef {
  id: string
  heading: Bi
  fields: FieldDef[]
}

// A loading-screen / results-page question asked one at a time by the coach.
export interface QuickQuestion {
  key: string
  label: Bi
  type: 'faces' | 'options'
  options?: Option[]
  low?: Bi    // wording under the 1 and 5 ends of a face scale
  high?: Bi
}

// ---------------------------------------------------------------------------
// Stage 1 — before results (loading screen, quick taps, never blocks the report)
// ---------------------------------------------------------------------------

export const stage1Intro: Bi = {
  en: 'Building your report… while you wait, four quick taps:',
  ar: 'جارٍ إعداد تقريرك… وأنت تنتظر، أربع نقرات سريعة:',
}

export const stage1Thanks: Bi = {
  en: 'Thank you for your quick feedback. Once you see your results, we will ask four more short questions.',
  ar: 'شكراً لك على ملاحظاتك السريعة. بعد أن ترى نتائجك، سنطرح عليك أربعة أسئلة قصيرة أخرى.',
}

export const stage1Questions: QuickQuestion[] = [
  { key: 's1_understood', type: 'faces',
    label: { en: 'How well do you think we understood you?', ar: 'إلى أي مدى تعتقد أننا فهمناك؟' },
    low: { en: 'Not at all', ar: 'لا إطلاقًا' }, high: { en: 'Completely', ar: 'تمامًا' } },
  { key: 's1_intent', type: 'options',
    label: { en: 'What do you most want from your results?', ar: 'ما الذي تتمنى الحصول عليه أكثر من نتائجك؟' },
    options: [
      { value: 'confirm_right_path', label: { en: "Confirm I'm on the right path", ar: 'تأكيد أنني على المسار الصحيح' } },
      { value: 'discover_new_options', label: { en: 'Discover new options', ar: 'اكتشاف خيارات جديدة' } },
      { value: 'choose_university_major', label: { en: 'Choose a university major', ar: 'اختيار تخصص جامعي' } },
      { value: 'plan_career_change', label: { en: 'Plan a career change', ar: 'التخطيط لتغيير مساري المهني' } },
      { value: 'get_job_faster', label: { en: 'Get a job faster', ar: 'الحصول على وظيفة بشكل أسرع' } },
      { value: 'understand_ai_impact', label: { en: 'Understand how AI affects my field', ar: 'فهم تأثير الذكاء الاصطناعي على مجالي' } },
    ] },
  // A baseline to compare with how people feel after the follow-up.
  { key: 's1_confidence', type: 'faces',
    label: { en: 'How confident do you feel about your career direction right now?', ar: 'ما مدى ثقتك باتجاهك المهني في الوقت الحالي؟' },
    low: { en: 'Not at all confident', ar: 'لست واثقًا إطلاقًا' }, high: { en: 'Very confident', ar: 'واثق جدًا' } },
  { key: 's1_length', type: 'options',
    label: { en: 'How did the length of the assessment feel?', ar: 'كيف وجدت طول التقييم؟' },
    options: [
      { value: 'too_short', label: { en: 'Too short', ar: 'قصير جدًا' } },
      { value: 'about_right', label: { en: 'About right', ar: 'مناسب' } },
      { value: 'a_bit_long', label: { en: 'A bit long', ar: 'طويل قليلًا' } },
      { value: 'too_long', label: { en: 'Too long', ar: 'طويل جدًا' } },
    ] },
]

// ---------------------------------------------------------------------------
// Stage 2 — on the results page (shown right after the report; never gating)
// ---------------------------------------------------------------------------

export const resultStageIntro: Bi = {
  en: 'Four quick questions about your results:',
  ar: 'أربعة أسئلة سريعة عن نتائجك:',
}

export const resultStageQuestions: QuickQuestion[] = [
  { key: 'result_accuracy', type: 'options',
    label: { en: 'How accurate was this?', ar: 'ما مدى دقة هذا التقرير؟' },
    options: [
      { value: 'spot_on', label: { en: '🎯 Spot on', ar: '🎯 دقيق تمامًا' } },
      { value: 'mostly_right', label: { en: '👍 Mostly right', ar: '👍 صحيح إلى حدٍّ كبير' } },
      { value: 'off', label: { en: '👎 Off', ar: '👎 غير دقيق' } },
    ] },
  { key: 'career_explained', type: 'options',
    label: { en: 'Did you understand why each career was suggested?', ar: 'هل فهمت سبب اقتراح كل مسار مهني؟' },
    options: [
      { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
      { value: 'partly', label: { en: 'Partly', ar: 'جزئيًا' } },
      { value: 'no', label: { en: 'No', ar: 'لا' } },
    ] },
  { key: 'careers_seriously_considered', type: 'options',
    label: { en: 'How many of these careers would you seriously consider?', ar: 'كم عدد هذه المسارات التي قد تفكر فيها جديًا؟' },
    options: [
      { value: 'none', label: { en: 'None', ar: 'لا شيء منها' } },
      { value: 'one', label: { en: '1', ar: '١' } },
      { value: 'a_few', label: { en: '2–3', ar: '٢-٣' } },
      { value: 'four_or_five', label: { en: '4–5', ar: '٤-٥' } },
    ] },
]

// Q8 — optional free text, saved to other_text.
export const resultStageNoteLabel: Bi = {
  en: 'What felt off, or what was missing from your results? (optional)',
  ar: 'ما الذي بدا لك غير دقيق، أو ما الذي كان ناقصًا في نتائجك؟ (اختياري)',
}

// ---------------------------------------------------------------------------
// Stage 3 — follow-up form (24-48h after results for free users, 7 days after unlocking for paid)
// ---------------------------------------------------------------------------

const YES_SOMEWHAT_NO: Option[] = [
  { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
  { value: 'somewhat', label: { en: 'Somewhat', ar: 'إلى حدٍّ ما' } },
  { value: 'no', label: { en: 'No', ar: 'لا' } },
]

// Report sections the reader can pick as most / least useful. The target company list is not in the
// launch report. Free users can open only the first five; the rest are locked for them.
const FREE_SECTION_OPTIONS: Option[] = [
  { value: 'personality', label: { en: 'Personality profile', ar: 'ملف الشخصية' } },
  { value: 'values', label: { en: 'Values', ar: 'القيم' } },
  { value: 'strengths', label: { en: 'Strengths', ar: 'نقاط القوة' } },
  { value: 'careers', label: { en: 'Career matches', ar: 'المسارات المهنية' } },
  { value: 'ai_impact', label: { en: 'AI Impact', ar: 'تأثير الذكاء الاصطناعي' } },
]
const PAID_SECTION_OPTIONS: Option[] = [
  ...FREE_SECTION_OPTIONS,
  { value: 'jobs', label: { en: 'Job listings', ar: 'الوظائف المعروضة' } },
  { value: 'courses', label: { en: 'Courses', ar: 'الدورات' } },
  { value: 'plan', label: { en: '90-day plan', ar: 'خطة الـ ٩٠ يومًا' } },
]

// Q16 — one main blocker (single choice), free users only.
const PURCHASE_BLOCKER_OPTIONS: Option[] = [
  { value: 'careers_dont_fit', label: { en: "The suggested careers don't feel right for me", ar: 'المسارات المقترحة لا تبدو مناسبة لي' } },
  { value: 'free_results_enough', label: { en: 'The free results already give me enough', ar: 'النتائج المجانية تكفيني بالفعل' } },
  { value: 'not_sure_next_step', label: { en: "I'm still not sure what to do next", ar: 'ما زلت غير متأكد من خطوتي التالية' } },
  { value: 'doesnt_reflect_situation', label: { en: "It doesn't reflect my situation (e.g. student, or years of experience)", ar: 'لا يعكس وضعي (مثل كوني طالبًا، أو عدد سنوات خبرتي)' } },
  { value: 'want_coach_first', label: { en: "I'd want to speak with a real coach first", ar: 'أرغب في التحدث مع مدرب حقيقي أولًا' } },
  { value: 'price_higher_than_expected', label: { en: "The price is higher than I'd expect", ar: 'السعر أعلى مما توقعت' } },
  { value: 'dont_usually_pay', label: { en: "I don't usually pay for career tools", ar: 'لا أدفع عادةً مقابل أدوات مهنية' } },
  { value: 'someone_else_decides', label: { en: 'Someone else would decide this (e.g. a parent)', ar: 'شخص آخر هو من سيقرر (مثل أحد الوالدين)' } },
  { value: 'other', label: { en: 'Other', ar: 'أخرى' } },
]

export const followUpHook = (tier: 'free' | 'paid'): Bi => tier === 'paid'
  ? {
      en: 'You have had a week with your full report. Tell us what worked and what did not. About 3 minutes.',
      ar: 'مضى أسبوع على تقريرك الكامل. أخبرنا بما أفادك وما لم يفدك. حوالي ٣ دقائق.',
    }
  : {
      en: 'You have had a day or two with your results. Help us make them sharper for the next person. About 2 minutes.',
      ar: 'مضى يوم أو يومان على نتائجك. ساعدنا في جعلها أدق لمن يأتي بعدك. حوالي دقيقتين.',
    }

export const stage2CoCreator: Bi = {
  en: 'Your answers help us make Etijahi better. Any question you flag as "off" gets reviewed by our team.',
  ar: 'إجاباتك تساعدنا على تطوير اتجاهي. أي سؤال تشير إلى أنه «غير دقيق» سيراجعه فريقنا.',
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

// The follow-up form for this reader. Free: Q9-Q17 (Q11 only if they opened the AI Impact preview,
// Q15 only for Arabic reports, Q17 only for "Other"). Paid: Q9-Q11, Q13-Q15, Q18-Q23.
export function followUpSections(tier: 'free' | 'paid'): SectionDef[] {
  const paid = tier === 'paid'
  const sectionOptions = paid ? PAID_SECTION_OPTIONS : FREE_SECTION_OPTIONS

  const q9: FieldDef = {
    key: 'felt_like_mentor', type: 'single', required: true,
    label: { en: 'Did it feel like a coach who understands your situation, or a generic quiz?', ar: 'هل شعرت أنه مدرّب يفهم وضعك، أم اختبار عام؟' },
    options: [
      { value: 'mentor', label: { en: 'Like a coach who understands me', ar: 'كمدرّب يفهمني' } },
      { value: 'mixed', label: { en: 'Somewhere in between', ar: 'بين الاثنين' } },
      { value: 'generic', label: { en: 'Like a generic quiz', ar: 'كاختبار عام' } },
    ],
  }
  const q10: FieldDef = {
    key: 'most_useful_part', type: 'single', required: true, options: sectionOptions,
    label: { en: 'Which part was most useful to you?', ar: 'أي جزء كان الأكثر فائدة لك؟' },
  }
  const q11: FieldDef = {
    key: 'ai_impact_changed_thinking', type: 'single', required: true, options: YES_SOMEWHAT_NO,
    label: paid
      ? { en: 'Did the AI Impact section change how you see your path?', ar: 'هل غيّر قسم تأثير الذكاء الاصطناعي نظرتك لمسارك المهني؟' }
      : { en: 'Did the AI Impact preview change how you see your path?', ar: 'هل غيّر ملخص تأثير الذكاء الاصطناعي نظرتك لمسارك المهني؟' },
    // Free users are asked only if they opened the preview; paid users always.
    showIf: (_a, ctx) => paid || ctx.openedAiImpact,
  }
  const q12: FieldDef = {
    key: 'first_step', type: 'multi', required: true,
    label: { en: 'What do you plan to do first? (select all that apply)', ar: 'ما أول خطوة تنوي القيام بها بعد النتائج؟ (يمكن اختيار أكثر من إجابة)' },
    options: [
      { value: 'search_jobs_training', label: { en: 'Search for jobs or training', ar: 'البحث عن وظائف أو تدريب' } },
      { value: 'enrol_course', label: { en: 'Enrol in a course', ar: 'التسجيل في دورة' } },
      { value: 'talk_parent_mentor', label: { en: 'Talk to a parent or mentor', ar: 'التحدث مع أحد الوالدين أو مرشد' } },
      { value: 'rethink_major', label: { en: 'Rethink my major', ar: 'إعادة التفكير في تخصصي' } },
      { value: 'nothing_yet', label: { en: 'Nothing yet', ar: 'لم أقرر بعد' } },
    ],
  }
  const q13: FieldDef = {
    key: 'wants_coach_session', type: 'single', required: true,
    label: { en: 'Would a session with a career coach to go through your results be useful?', ar: 'هل ستكون جلسة مع مدرّب مهني لمراجعة نتائجك مفيدة؟' },
    options: [
      { value: 'yes_pay', label: { en: "Yes, I'd pay for it", ar: 'نعم، سأدفع مقابلها' } },
      { value: 'if_included', label: { en: 'Only if included', ar: 'فقط إذا كانت مدرجة' } },
      { value: 'no', label: { en: 'No', ar: 'لا' } },
    ],
  }
  const q14: FieldDef = {
    key: 'would_recommend', type: 'single', required: true,
    label: { en: 'Would you recommend Etijahi to a friend?', ar: 'هل توصي بإتجاهي لصديق؟' },
    options: [
      { value: 'yes', label: { en: 'Yes', ar: 'نعم' } },
      { value: 'maybe', label: { en: 'Maybe', ar: 'ربما' } },
      { value: 'no', label: { en: 'No', ar: 'لا' } },
    ],
  }
  const q15: FieldDef = {
    key: 'arabic_natural', type: 'single', required: true,
    label: { en: 'Did the Arabic in your report feel natural?', ar: 'هل بدت لك اللغة العربية في التقرير طبيعية؟' },
    options: [
      { value: 'natural', label: { en: 'Natural', ar: 'طبيعية' } },
      { value: 'mixed', label: { en: 'Mixed', ar: 'مختلطة' } },
      { value: 'translation', label: { en: 'Like a translation', ar: 'تبدو مترجمة' } },
    ],
    showIf: (_a, ctx) => ctx.reportLocale === 'ar',
  }

  if (!paid) {
    return [
      { id: 'A', heading: { en: 'Your results', ar: 'نتائجك' }, fields: [q9, q10, q11, q12] },
      { id: 'B', heading: { en: 'What next', ar: 'الخطوة التالية' }, fields: [q13, q14, q15] },
      {
        id: 'C', heading: { en: 'The full report', ar: 'التقرير الكامل' },
        fields: [
          {
            key: 'purchase_blocker', type: 'single', required: true, options: PURCHASE_BLOCKER_OPTIONS,
            label: { en: 'What is the main thing holding you back from buying the full report?', ar: 'ما أكثر ما يمنعك من شراء التقرير الكامل؟' },
          },
          {
            key: 'pay_blocker_other_text', type: 'text',
            label: { en: 'You said "Other" — what did you mean?', ar: 'ذكرت «أخرى» — ماذا كنت تقصد؟' },
            showIf: (a) => a.purchase_blocker === 'other',
          },
        ],
      },
    ]
  }

  const face = (key: string, label: Bi, low: Bi, high: Bi): FieldDef => ({ key, type: 'face5', required: true, label, low, high })
  return [
    { id: 'A', heading: { en: 'Your report', ar: 'تقريرك' }, fields: [q9, q10, q11] },
    { id: 'B', heading: { en: 'What next', ar: 'الخطوة التالية' }, fields: [q13, q14, q15] },
    {
      id: 'C', heading: { en: 'The full report', ar: 'التقرير الكامل' },
      fields: [
        face('overall_value',
          { en: 'Was the full report worth what you paid?', ar: 'هل كان التقرير الكامل يستحق ما دفعته؟' },
          { en: 'Not worth it', ar: 'لم يستحق' }, { en: 'Definitely worth it', ar: 'يستحق بالتأكيد' }),
        face('jobs_relevant',
          { en: 'How relevant were the suggested jobs?', ar: 'ما مدى ملاءمة الوظائف المقترحة لك؟' },
          { en: 'Not relevant', ar: 'غير مناسبة' }, { en: 'Very relevant', ar: 'مناسبة جدًا' }),
        face('courses_useful',
          { en: 'How useful were the courses?', ar: 'ما مدى فائدة الدورات المقترحة؟' },
          { en: 'Not useful', ar: 'غير مفيدة' }, { en: 'Very useful', ar: 'مفيدة جدًا' }),
        {
          key: 'plan_would_follow', type: 'single', required: true, options: YES_SOMEWHAT_NO,
          label: { en: 'Will you follow the 90-day plan?', ar: 'هل ستلتزم بخطة الـ ٩٠ يومًا؟' },
        },
        {
          key: 'least_useful_part', type: 'single', required: true, options: sectionOptions,
          label: { en: 'Which part was least useful to you?', ar: 'أي جزء كان الأقل فائدة لك؟' },
        },
        {
          key: 'missing_text', type: 'text',
          label: { en: 'What was missing?', ar: 'ما الذي كان ينقصك؟' },
        },
      ],
    },
  ]
}
