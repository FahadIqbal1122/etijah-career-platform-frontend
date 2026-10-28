// Campaign landing-page variants for the ads: /students, /parents, /career-changer and /coach. Same layout, sections
// and assessment flow as the main landing page (which is unchanged) — only the hero text differs. Any field left
// undefined falls back to the default copy in src/data/landing.ts.
//
// `headline` is [line 1, line 2]; `hl` is the phrase inside line 2 shown in teal.
// The English text is a draft for the owner to approve; the Arabic is a first draft and needs a native-speaker review.
// Writing rules as for the report: plain words, advice not orders, no promises about jobs, no "AI-powered".

export const VARIANT_SLUGS = ['students', 'parents', 'career-changer', 'coach'] as const
export type VariantSlug = (typeof VARIANT_SLUGS)[number]

export interface HeroOverride {
  eyebrow?: string
  headline?: [string, string]
  hl?: string
  sub?: string
  cta?: string
}

export const LANDING_VARIANTS: Record<VariantSlug, Record<'en' | 'ar', HeroOverride>> = {
  students: {
    en: {
      eyebrow: 'Choosing a major, or not sure your degree is the right one?',
      // previous: headline: ['Don’t choose your degree', 'by guessing'], hl: 'by guessing',
      headline: ['Unsure which', 'major to choose?'],
      hl: 'major to choose?',
      sub: 'Many students pick a major from what family, friends or a placement list suggests, then wonder if it was right. In about 15 minutes, your own answers show which fields fit your interests, values and strengths, which careers they lead to, and small ways to try them before you commit.',
    },
    ar: {
      eyebrow: 'تختار تخصصاً، أو لست متأكداً أن تخصصك هو المناسب؟',
      // previous: headline: ['لا تختر تخصصك', 'بالتخمين'], hl: 'بالتخمين',
      headline: ['لست متأكداً', 'أي تخصص تختار؟'],
      hl: 'أي تخصص تختار؟',
      sub: 'يختار كثير من الطلاب تخصصهم بحسب ما تقترحه العائلة أو الأصدقاء أو قائمة القبول، ثم يتساءلون إن كان القرار صائباً. في نحو ١٥ دقيقة، تُظهر إجاباتك أنت أي المجالات تناسب اهتماماتك وقيمك ونقاط قوتك، وإلى أي مهن تقود، وطرقاً صغيرة لتجربتها قبل أن تلتزم.',
    },
  },
  parents: {
    en: {
      eyebrow: 'Your child is about to choose a major. You want them to choose well.',
      headline: ['Help your child choose', 'from their own results'],
      hl: 'their own results',
      sub: 'A good decision about a major starts with knowing the student, not only the options. Your child answers questions about what they enjoy, what matters to them and where they are strong. The report shows fields and careers that fit, and gentle ways to try them first, so the two of you can talk about the choice with clear information in front of you.',
      cta: 'Start your child’s assessment',
    },
    ar: {
      eyebrow: 'ابنك أو ابنتك على وشك اختيار تخصص، وأنت تريد له اختياراً جيداً.',
      headline: ['ساعد ابنك أو ابنتك', 'على الاختيار بوضوح'],
      hl: 'بوضوح',
      sub: 'القرار الجيد حول التخصص يبدأ بمعرفة الطالب نفسه، لا بمعرفة الخيارات وحدها. يجيب ابنك أو ابنتك عن أسئلة حول ما يستمتع به وما يهمه وأين تكمن قوته. ويعرض التقرير مجالات ومهناً تناسبه، وطرقاً هادئة لتجربتها أولاً، لتتحدثا عن القرار معاً وأمامكما معلومات واضحة.',
      cta: 'ابدأ تقييم ابنك أو ابنتك',
    },
  },
  'career-changer': {
    en: {
      // previous: eyebrow: 'Thinking about a different path, but not sure which one?',
      eyebrow: 'A recent graduate, or thinking about a different path?',
      // previous: headline: ['Change direction', 'with a clear picture'], hl: 'a clear picture',
      headline: ['Unsure how to get', 'your dream job?'],
      hl: 'your dream job?',
      sub: 'Wanting something different is a good reason to look more closely, not a reason to start again without a compass. Your answers show which strengths and values you can take with you, which fields fit them, and what could be worth building first. Then you can decide with more than a feeling.',
    },
    ar: {
      // previous: eyebrow: 'تفكر في مسار مختلف، لكنك لست متأكداً أي مسار؟',
      eyebrow: 'خريج جديد، أو تفكر في مسار مختلف؟',
      // previous: headline: ['غيّر اتجاهك', 'برؤية واضحة'], hl: 'برؤية واضحة',
      headline: ['لست متأكداً كيف تصل', 'إلى وظيفة أحلامك؟'],
      hl: 'إلى وظيفة أحلامك؟',
      sub: 'الرغبة في شيء مختلف سبب جيد لتدقيق النظر، لا لتبدأ من الصفر دون بوصلة. تُظهر إجاباتك أي نقاط القوة والقيم يمكنك أن تأخذها معك، وأي المجالات تناسبها، وما قد يستحق أن تبنيه أولاً. وبعدها تقرر بأكثر من مجرد شعور.',
    },
  },
  coach: {
    en: {
      eyebrow: 'Looking for a career coach?',
      headline: ['Start with a clear picture', 'of where you stand'],
      hl: 'where you stand',
      sub: 'A coaching conversation goes further when it starts from clear information about you. Your assessment gives you that: your interests, values, strengths and work style, and the careers that fit them. It is built on the approach of Etijah Coaching & Consulting, and you can bring it to any conversation about your next step.',
    },
    ar: {
      eyebrow: 'تبحث عن مدرب مهني؟',
      headline: ['ابدأ بصورة واضحة', 'عن موقعك الحالي'],
      hl: 'عن موقعك الحالي',
      sub: 'تذهب جلسة التدريب المهني أبعد حين تبدأ من معلومات واضحة عنك. وهذا ما يقدمه لك التقييم: اهتماماتك وقيمك ونقاط قوتك وأسلوب عملك، والمهن التي تناسبها. وهو مبني على نهج اتجاه للإرشاد والاستشارات، ويمكنك أن تصطحبه إلى أي حديث عن خطوتك التالية.',
    },
  },
}
