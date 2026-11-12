// Scripted coach lines from the "Etijahi Pay Gate: IT Implementation Brief" (10 Nov 2026).
// One string table keyed by message ID (idea-segment-number), so content can be matched back to the brief and later moved
// to Admin without touching the code that uses it. Placeholders in {curly brackets} are filled by fillScript().
// Copy rules from the brief: Arabic is gender-neutral on purpose (do not "fix" it), no em dashes, never "free" / مجاناً.
import type { Bi } from '@/data/coachMessages'
import { computeRanked } from '@/data/revealScoring'
import { apiGet } from '@/lib/api'

// ── Admin overrides ──
// What Admin saves (Coach tab, "Coach messages") replaces a line's English and/or Arabic text. Keys are the brief's message
// IDs; the ready-made bubbles use "<ID>.q" (the question) and "<ID>.a" (the answer). Anything not overridden keeps the
// built-in wording below, so an empty table changes nothing.
type Over = Record<string, Partial<Bi>>
let OV: Over = {}
let TRAIT_HIGH = 4.5
let TRAIT_LOW = 2.5
export function setScriptOverrides(messages?: Over, high?: number, low?: number) {
  OV = messages && typeof messages === 'object' ? messages : {}
  if (typeof high === 'number' && typeof low === 'number' && low > 1 && high > low && high < 6) { TRAIT_HIGH = high; TRAIT_LOW = low }
}
const ov = (key: string, base: Bi): Bi => ({ en: OV[key]?.en || base.en, ar: OV[key]?.ar || base.ar })

let loading: Promise<void> | null = null
/** Reads the saved overrides once per page load. Never throws: if the request fails the built-in wording is used. */
export function loadScriptOverrides(): Promise<void> {
  if (!loading) {
    loading = apiGet<{ messages?: Over; trait_high?: number; trait_low?: number }>('/coach-script')
      .then(d => setScriptOverrides(d?.messages, d?.trait_high, d?.trait_low))
      .catch(() => { /* built-in wording */ })
  }
  return loading
}

export const COACH_SCRIPT: Record<string, Bi> = {
  // ── Idea 17: welcome after the first question (QO4: where are you now) ──
  '17-HS-01': {
    en: 'Hi {name}. Many students pick a major and only find out later it isn’t for them. You’re starting with what matters most: what actually suits you. There are no right or wrong answers here, just be honest.',
    ar: 'أهلاً {name}. كثير من الطلاب يختارون تخصصاً ثم يكتشفون لاحقاً أنه لا يناسبهم. أما البداية هنا فمن الأهم: ما يناسبك فعلاً. لا توجد إجابات صحيحة أو خاطئة، المهم الصدق.',
  },
  '17-UNI-01': {
    en: 'Hi {name}. Whether your major feels right or you still have questions about it, now is the right time to see where it can take you. Let’s find what suits your personality, not just your major.',
    ar: 'أهلاً {name}. سواء كان تخصصك يناسبك أو ما زالت لديك تساؤلات حوله، هذا هو الوقت المناسب لمعرفة إلى أين يمكن أن يأخذك. لنكتشف ما يناسب شخصيتك، لا تخصصك فقط.',
  },
  '17-GRAD-01': {
    en: 'Congratulations on graduating, {name}. Your first job can feel like it will decide everything, and that’s a lot of pressure. Let’s make your first step a well-informed one.',
    ar: 'مبارك التخرج يا {name}. الوظيفة الأولى تبدو وكأنها ستحدد كل شيء، وهذا ضغط كبير. لنجعل خطوتك الأولى مبنية على معرفة واضحة بما يناسبك.',
  },
  '17-CHG-01': {
    en: 'Hi {name}. Wondering whether something else would suit you better is a sign of self-awareness, not indecision. No decisions are needed today. Let’s start by understanding what really fits you.',
    ar: 'أهلاً {name}. التساؤل عن مسار يناسبك أكثر علامة وعي، لا علامة تردد. لا حاجة لاتخاذ أي قرار اليوم، لنبدأ بفهم ما يناسبك فعلاً.',
  },
  '17-CHG-02': {
    en: 'Hi {name}. Deciding to change careers takes courage, and your experience isn’t lost. It comes with you. Let’s find the direction that fits who you are today.',
    ar: 'أهلاً {name}. قرار تغيير المسار المهني يحتاج إلى شجاعة، وخبرتك السابقة لن تضيع، بل ستنتقل معك. لنكتشف معاً الاتجاه الذي يشبهك اليوم.',
  },
  '17-RET-01': {
    en: 'Welcome back, {name}. Returning after a break is a fresh start, and what you gained during that time counts too. Let’s find work that fits your life now.',
    ar: 'أهلاً بعودتك يا {name}. العودة بعد انقطاع بداية جديدة، وما اكتسبته خلال تلك الفترة له قيمته أيضاً. لنكتشف معاً عملاً يناسب حياتك الآن.',
  },
  '17-RET-02': {
    en: 'Hi {name}. The time between jobs can feel uncertain, but it’s also the best moment to choose your next step on purpose. Let’s make it one that fits you.',
    ar: 'أهلاً {name}. الفترة بين وظيفتين قد تحمل شيئاً من القلق، لكنها أيضاً أفضل وقت لاختيار الخطوة القادمة عن قناعة. لنجعلها خطوة تناسبك.',
  },
  '17-OTH-01': {
    en: 'Hi {name}. Everyone’s path is different, and yours is welcome here. Let’s discover what fits you.',
    ar: 'أهلاً {name}. لكل شخص طريقه الخاص، ونحن هنا لنساعدك في اكتشاف ما يناسبك.',
  },

  // ── Idea 17: reply after the goal question (QO5C_HS / QO5C / QO5C_PRO) ──
  '17-G-01': {
    en: 'Good choice. Your full report shows the careers that suit you and what to study for each one.',
    ar: 'اختيار موفق. تقريرك الكامل يوضح المسارات المهنية التي تناسبك، وما يلزم دراسته لكل مسار.',
  },
  '17-G-02': {
    en: 'A great place to start. Knowing which careers suit you makes choosing a major much easier.',
    ar: 'بداية موفقة. معرفة المسارات المهنية المناسبة أولاً تجعل اختيار التخصص أسهل بكثير.',
  },
  '17-G-03': {
    en: 'That’s completely normal, and lots of students feel the same. That’s exactly why Etijahi exists.',
    ar: 'هذا طبيعي تماماً، وكثير من الطلاب يمرّون بالشعور نفسه. ولهذا وُجد إتجاهي.',
  },
  '17-G-04': {
    en: 'Your report will show where your field can take you, including paths you may not have thought of.',
    ar: 'سيوضح تقريرك إلى أين يمكن أن يأخذك تخصصك، بما في ذلك مسارات ربما لم تخطر على بالك.',
  },
  '17-G-05': {
    en: 'Many students feel this way, and it’s better to ask now than after graduation. Let’s see what fits you.',
    ar: 'كثير من الطلاب يمرّون بهذا الشعور، وطرح السؤال الآن أفضل من طرحه بعد التخرج. لنرَ ما يناسبك.',
  },
  '17-G-06': {
    en: 'Your degree still counts, even in a new direction. Let’s see where your interests lead.',
    ar: 'شهادتك تبقى مصدر قوة حتى في اتجاه جديد. لنرَ إلى أين تقودك اهتماماتك.',
  },
  '17-G-07': {
    en: 'Good. We’ll look at where your experience can take you next.',
    ar: 'ممتاز. سننظر في الخطوة التالية التي يمكن أن تأخذك إليها خبرتك.',
  },
  '17-G-08': {
    en: 'That feeling usually means something needs to change, not that you chose wrong. Let’s find out what.',
    ar: 'هذا الشعور غالباً يعني أن شيئاً ما يحتاج إلى تغيير، لا أن الاختيار كان خاطئاً. لنكتشف ما هو.',
  },
  '17-G-09': {
    en: 'A fresh start is easier when the next direction is clear, not only what we want to leave behind. Let’s find it together.',
    ar: 'البداية الجديدة أسهل حين يكون الاتجاه القادم واضحاً، وليس فقط ما نريد تركه خلفنا. لنكتشفه معاً.',
  },
  '17-G-10': {
    en: 'That’s completely normal. Clarity starts here.',
    ar: 'هذا طبيعي تماماً، والوضوح يبدأ من هنا.',
  },
  '17-G-11': {
    en: 'Thanks. We’ll keep that in mind.',
    ar: 'شكراً، سنأخذ ذلك في الاعتبار.',
  },

  // ── Idea 18: guidance during the assessment ──
  // Page lines under the Interests & Personality title (static text, not a coach bubble)
  '18-HS-01': {
    en: 'These questions are about what you enjoy, not your grades, in school and outside it.',
    ar: 'الأسئلة التالية تدور حول ما يستهويك، لا حول درجاتك المدرسية، سواء داخل المدرسة أو خارجها.',
  },
  '18-UNI-01': {
    en: 'Answer based on what you genuinely enjoy, not only what your degree requires.',
    ar: 'المقصود هنا ما يستهويك فعلاً، لا ما يتطلبه تخصصك فقط.',
  },
  '18-CHG-01': {
    en: 'Some questions describe work situations. Thinking about what gave you energy in past roles, and what drained you, will make your results more accurate.',
    ar: 'بعض الأسئلة تتناول مواقف من بيئة العمل. استحضار ما كان يمنحك الحماس في عملك السابق، وما كان يستنزفك، يساعد على دقة النتائج.',
  },
  // Coach check-ins
  '18-ALL-02': {
    en: 'Halfway through this chapter, and your interest profile is already taking shape.',
    ar: 'وصلنا إلى منتصف هذا الفصل، وملامح اهتماماتك بدأت تتضح.',
  },
  '18-CHG-02': {
    en: 'Halfway there. This is time most people rarely give themselves: time to think about what they really want from work.',
    ar: 'وصلنا إلى المنتصف. هذه مساحة قلّما يمنحها الناس لأنفسهم: وقت للتفكير فيما يريدونه فعلاً من العمل.',
  },
  '18-ALL-03': {
    en: 'Two more questions, then I’ll show you what your answers say so far.',
    ar: 'سؤالان فقط، ثم أعرض عليك ما تكشفه إجاباتك حتى الآن.',
  },
  '18-ALL-04': {
    en: 'No rush. Your first instinct is usually the most honest answer.',
    ar: 'لا داعي للعجلة، الإجابة الأولى التي تخطر على البال غالباً هي الأصدق.',
  },
  '18-ALL-05': {
    en: 'Welcome back, {name}. Your answers are saved, so let’s continue where we stopped.',
    ar: 'أهلاً بعودتك يا {name}. إجاباتك محفوظة، لنكمل من حيث توقفنا.',
  },
}

// QO4 answer (+ age for "other") -> which set of chapter lines and check-ins the person gets: HS, UNI (university and
// graduates) or CHG (changers, returners, between jobs). "Other" gets CHG at 23 or over, otherwise UNI.
export function segmentGroup(qo4: unknown, age: unknown): 'HS' | 'UNI' | 'CHG' {
  if (qo4 === 'high_school') return 'HS'
  if (qo4 === 'university' || qo4 === 'recent_graduate') return 'UNI'
  if (qo4 === 'other') return Number(age) >= 23 ? 'CHG' : 'UNI'
  return 'CHG'
}

// QO4 answer -> welcome message ID
const WELCOME_ID: Record<string, string> = {
  high_school: '17-HS-01',
  university: '17-UNI-01',
  recent_graduate: '17-GRAD-01',
  working_exploring: '17-CHG-01',
  career_changer: '17-CHG-02',
  returning: '17-RET-01',
  between_roles: '17-RET-02',
  other: '17-OTH-01',
}

// Goal question (which of the three the person sees depends on QO4) + answer -> reply message ID
const GOAL_ID: Record<string, Record<string, string>> = {
  QO5C_HS: { choosing_major: '17-G-01', explore_careers: '17-G-02', not_sure: '17-G-03', other: '17-G-11' },
  QO5C: { stay_in_field: '17-G-04', unsure_subject: '17-G-05', change_field: '17-G-06', not_sure: '17-G-10', other: '17-G-11' },
  QO5C_PRO: { stay_in_field: '17-G-07', unsure_subject: '17-G-08', change_field: '17-G-09', not_sure: '17-G-10', other: '17-G-11' },
}

// Same rule as PRO_STAGES in AssessmentForm: these QO4 answers get the work-wording goal question.
const PRO_STAGES = ['working_exploring', 'career_changer', 'returning', 'between_roles', 'other']

/** Which goal question this person sees (QO5C_HS for high school, QO5C_PRO for working people, QO5C otherwise). */
export function goalQuestionKey(qo4: unknown): 'QO5C_HS' | 'QO5C_PRO' | 'QO5C' | null {
  if (typeof qo4 !== 'string' || !qo4) return null
  if (qo4 === 'high_school') return 'QO5C_HS'
  return PRO_STAGES.includes(qo4) ? 'QO5C_PRO' : 'QO5C'
}

export function welcomeId(qo4: unknown): string | null {
  return typeof qo4 === 'string' ? WELCOME_ID[qo4] ?? null : null
}

export function goalReplyId(qo4: unknown, answer: unknown): string | null {
  const key = goalQuestionKey(qo4)
  return key && typeof answer === 'string' ? GOAL_ID[key][answer] ?? null : null
}

/** First name from the full-name answer (QD1). */
export function firstName(full: unknown): string {
  return typeof full === 'string' ? full.trim().split(/\s+/)[0] ?? '' : ''
}

/** A scripted line with its {placeholders} filled, in both languages. Returns null for an unknown ID. */
export function fillScript(id: string, vars: Record<string, string> = {}): Bi | null {
  const base = COACH_SCRIPT[id]
  if (!base) return null
  const m = ov(id, base)
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
  return { en: fill(m.en), ar: fill(m.ar) }
}

// ── Ideas 2 + 16: ready-made question bubbles at the pay gate (static answers only, no AI call) ──
// Only the bubbles that need no scores are here. The score-based ones (C2, C3, C7, H1, U1, G1, K3) and the AI check (C4)
// wait for the label logic. Held back until decisions are confirmed: C5 (accuracy claim: the brief says "two models" but the
// platform measures five frameworks), C6 (privacy wording, decision 6), H2 (refers to the new parent button).
// {minutes_left} is filled with 10, the same figure the pay screen shows. Arabic uses Arabic-Indic digits.
type Bubble = { q: Bi; a: Bi }

const BUBBLE_C1: Bubble = {
  q: { en: 'What will I get in the full report?', ar: 'ماذا سأحصل عليه في التقرير الكامل؟' },
  a: {
    en: 'Your full report covers the careers that fit you best and why, what to study for each one, how AI is changing each career, your values, strengths and work style, and practical next steps. About 10 minutes are left to finish.',
    ar: 'يشمل تقريرك الكامل المسارات المهنية الأنسب لك وأسباب ملاءمتها، وما يلزم دراسته لكل مسار، وأثر الذكاء الاصطناعي على كل مهنة، وقيمك ونقاط قوتك وأسلوبك في العمل، إضافة إلى خطوات عملية واضحة. ويتبقى نحو ١٠ دقائق لإكماله.',
  },
}

const BUBBLES: Record<string, Bubble> = {
  H3: {
    q: { en: 'What if my family wants a different major for me?', ar: 'ماذا لو أراد أهلي تخصصاً مختلفاً؟' },
    a: {
      en: 'That’s very common, and your family’s view matters. The report helps that conversation rest on clear reasons rather than impressions, because it shows which careers suit you and why.',
      ar: 'هذا أمر شائع جداً، ورأي الأهل له قيمته. التقرير يساعد على أن يكون الحوار معهم مبنياً على أسباب واضحة لا على الانطباعات، لأنه يوضح المسارات المناسبة وأسباب ملاءمتها.',
    },
  },
  U2: {
    q: { en: 'Can it help me plan internships and my first job?', ar: 'هل يساعدني في التخطيط للتدريب والوظيفة الأولى؟' },
    a: {
      en: 'Yes. Once you know which careers fit you, it’s much easier to choose internships, courses and first roles that build towards them. Your report includes practical next steps for that.',
      ar: 'نعم. حين تتضح المسارات المهنية المناسبة، يصبح اختيار التدريب والدورات والوظيفة الأولى أسهل بكثير، وتقريرك يتضمن خطوات عملية تساعد على ذلك.',
    },
  },
  G2: {
    q: { en: 'What if my degree doesn’t match what I want?', ar: 'ماذا لو كانت شهادتي لا تتوافق مع ما أريده؟' },
    a: {
      en: 'That’s more common than you’d think, and your degree still counts. Your report shows which careers fit you and what each one needs, so you can see which are a short step from your degree and which need more preparation.',
      ar: 'هذا أكثر شيوعاً مما يبدو، وشهادتك تبقى ذات قيمة. تقريرك يوضح المسارات المناسبة لك ومتطلبات كل منها، لتتضح المسارات القريبة من شهادتك وتلك التي تحتاج إلى استعداد أكبر.',
    },
  },
  K1: {
    q: { en: 'Is it too late to change careers?', ar: 'هل فات الأوان لتغيير مساري المهني؟' },
    a: {
      en: 'No. Many people change direction more than once, and your experience gives you a head start most new graduates don’t have. What matters is choosing a direction that fits who you are now, and that’s what your report is built for.',
      ar: 'لا. كثيرون يغيّرون مسارهم المهني أكثر من مرة، وخبرتك تمنحك نقطة انطلاق لا يملكها كثير من الخريجين الجدد. الأهم هو اختيار اتجاه يناسبك اليوم، وهذا ما صُمّم تقريرك من أجله.',
    },
  },
  K2: {
    q: { en: 'Will my experience count?', ar: 'هل ستُحتسب خبرتي السابقة؟' },
    a: {
      en: 'Yes. Skills like managing people, solving problems or working with clients carry into many careers. Your report identifies your strengths and links them to the careers where they count.',
      ar: 'نعم. مهارات مثل إدارة الفرق وحل المشكلات والتعامل مع العملاء تنتقل إلى مسارات كثيرة، وتقريرك يحدد نقاط قوتك ويربطها بالمسارات المهنية التي تبرز فيها.',
    },
  },
  R1: {
    q: { en: 'Will my career break hold me back?', ar: 'هل ستؤثر فترة الانقطاع على فرصي؟' },
    a: {
      en: 'A break is part of your story, not the end of it. What matters now is returning to work that fits you. Your report shows the careers that match your interests, values and strengths, with practical next steps to get there.',
      ar: 'فترة الانقطاع جزء من قصتك، وليست نهايتها. الأهم الآن هو العودة إلى عمل يناسبك. تقريرك يوضح المسارات المهنية التي تتوافق مع اهتماماتك وقيمك ونقاط قوتك، مع خطوات عملية للوصول إليها.',
    },
  },
  R2: {
    q: { en: 'Can I find work that fits my life now?', ar: 'هل يمكنني إيجاد عمل يناسب ظروفي الحالية؟' },
    a: {
      en: 'That’s exactly what the next section covers: what matters to you about stability, flexibility and how you work. Your report uses those answers to show careers that fit your life, not just your skills.',
      ar: 'هذا تحديداً ما يتناوله القسم التالي: ما يهمك في الاستقرار والمرونة وطريقة العمل. ويستخدم تقريرك هذه الإجابات ليوضح المسارات التي تناسب حياتك، لا مهاراتك فقط.',
    },
  },
}

// ── Idea 16, phase 2: the personal (score-based) bubbles ──
// Before the gate only the interest scores (Holland, Q1 to Q12 + the two either/or items) and the five work-style traits
// (Q13 to Q22) exist. So these answers may only talk about interests and work style, never values, strengths or a specific
// career as "your match". Labels and phrases are the brief's approved wording; if the report uses different words, the
// report wins and these are updated.
type Info = { label: Bi; desc: Bi; families: Bi }
const INTEREST: Record<string, Info> = {
  realistic: { label: { en: 'Practical', ar: 'العملي' }, desc: { en: 'building, fixing and working with tools or technology', ar: 'البناء والإصلاح والتعامل مع الأدوات والتقنية' },
    families: { en: 'engineering, technical and operations roles, aviation and construction', ar: 'الهندسة، والمجالات التقنية والتشغيلية، والطيران، والبناء' } },
  investigative: { label: { en: 'Investigative', ar: 'البحثي التحليلي' }, desc: { en: 'understanding how and why things work', ar: 'فهم كيف تعمل الأشياء ولماذا' },
    families: { en: 'science, medicine, data and research', ar: 'العلوم، والطب، والبيانات، والبحث العلمي' } },
  artistic: { label: { en: 'Creative', ar: 'الإبداعي' }, desc: { en: 'creating original ideas, designs or content', ar: 'ابتكار أفكار وتصاميم ومحتوى جديد' },
    families: { en: 'design, media, architecture and content creation', ar: 'التصميم، والإعلام، والعمارة، وصناعة المحتوى' } },
  social: { label: { en: 'Social', ar: 'الاجتماعي' }, desc: { en: 'helping, teaching and supporting people', ar: 'مساعدة الناس وتعليمهم ودعمهم' },
    families: { en: 'education, healthcare, counselling and human resources', ar: 'التعليم، والرعاية الصحية، والإرشاد، والموارد البشرية' } },
  enterprising: { label: { en: 'Enterprising', ar: 'القيادي' }, desc: { en: 'leading, persuading and driving projects forward', ar: 'القيادة والإقناع ودفع المشاريع إلى الأمام' },
    families: { en: 'business, marketing, law and entrepreneurship', ar: 'إدارة الأعمال، والتسويق، والقانون، وريادة الأعمال' } },
  conventional: { label: { en: 'Organised', ar: 'التنظيمي' }, desc: { en: 'organising information and working with clear systems', ar: 'تنظيم المعلومات والعمل وفق أنظمة واضحة' },
    families: { en: 'finance, accounting, administration and data management', ar: 'المالية، والمحاسبة، والإدارة، وإدارة البيانات' } },
}

// Work-style phrases: trait dimension → [high phrase, low phrase]. Calm under pressure (stability) is only ever shown when
// high, never when low. Scores are 1 to 6 averages (6 = "sounds exactly like me"); the two thresholds below are what the brief
// calls "set in Admin" (not yet editable there).
const TRAIT: Record<string, { high: Bi; low?: Bi }> = {
  openness: { high: { en: 'a clear pull towards new ideas and big-picture thinking', ar: 'انجذاب واضح للأفكار الجديدة والتفكير في الصورة الكبيرة' }, low: { en: 'a preference for practical, proven approaches', ar: 'تفضيل للأساليب العملية المجرّبة' } },
  conscientiousness: { high: { en: 'strong planning and high standards', ar: 'حسّ تخطيط عالٍ ومعايير مرتفعة في العمل' }, low: { en: 'flexibility and an ability to adapt as things change', ar: 'مرونة وقدرة على التكيّف مع المتغيرات' } },
  extraversion: { high: { en: 'energy that comes from people, and a readiness to share views', ar: 'طاقة تتجدد بالتواصل مع الناس وسرعة في طرح الرأي' }, low: { en: 'sharper focus when there is space and quiet', ar: 'تركيز أعلى حين تتوفر المساحة والهدوء' } },
  agreeableness: { high: { en: 'real care for others and their needs', ar: 'اهتمام حقيقي بالآخرين واحتياجاتهم' }, low: { en: 'an ability to set clear boundaries', ar: 'قدرة على وضع حدود واضحة' } },
  stability: { high: { en: 'a steady, calm approach under pressure', ar: 'ثبات وهدوء تحت الضغط' } },
}

export type HintProfile = { top: Info; second: Info; trait: Bi | null }

/** What the coach may say about this person before payment, from their own answers. Null until the interest questions are answered. */
export function hintProfile(answers: Record<string, unknown>): HintProfile | null {
  const interests = computeRanked(answers, 'riasec').filter(r => INTEREST[r.dimension])
  if (interests.length < 2) return null
  let trait: Bi | null = null
  let best = 0
  for (const t of computeRanked(answers, 'big_five')) {
    const phrases = TRAIT[t.dimension]
    if (!phrases) continue
    const level = t.score >= TRAIT_HIGH ? phrases.high : t.score <= TRAIT_LOW ? phrases.low : undefined
    if (!level) continue
    const away = Math.abs(t.score - 3.5)
    if (away > best) { best = away; trait = level }
  }
  return { top: INTEREST[interests[0].dimension], second: INTEREST[interests[1].dimension], trait }
}

type Ctx = { name: string; price: string }
const fillAll = (b: Bi, f: (t: string, l: 'en' | 'ar') => string): Bi => ({ en: f(b.en, 'en'), ar: f(b.ar, 'ar') })
const withProfile = (b: Bi, p: HintProfile, c: Ctx): Bi => fillAll(b, (t, l) => t
  .replace(/\{top_label\}/g, p.top.label[l]).replace(/\{second_label\}/g, p.second.label[l])
  .replace(/\{top_desc\}/g, p.top.desc[l]).replace(/\{top_families\}/g, p.top.families[l])
  .replace(/\{trait_1\}/g, p.trait ? p.trait[l] : '').replace(/\{price\}/g, c.price).replace(/\{name\}/g, c.name))

/** 16-ALL-00: the coach's one opening line at the gate. */
export function gateOpeningLine(p: HintProfile, c: Ctx): Bi {
  return withProfile(ov('16-ALL-00', {
    en: '{name}, I’ve looked at your answers. Your strongest interest is {top_label}, and it combines with {second_label} in an interesting way. Ask me about it.',
    ar: '{name}، اطّلعت على إجاباتك. أقوى اهتماماتك هو الجانب {top_label}، ويترابط مع الجانب {second_label} بطريقة لافتة. يمكنك سؤالي عن ذلك.',
  }), p, c)
}

// A template may have an optional trait sentence ([[ ... ]]): dropped when no trait is clearly high or low (QA item in the brief).
const TEMPLATE: Record<string, { q: Bi; a: Bi }> = {
  C2: {
    q: { en: 'What do my answers say so far?', ar: 'ماذا تقول إجاباتي حتى الآن؟' },
    a: {
      en: 'Your strongest interest is {top_label}: {top_desc}. [[Your answers also point to {trait_1}. ]]That’s a real part of your profile, but only one part. Your values and strengths, in the next section, decide which careers come first.',
      ar: 'أقوى اهتماماتك هو الجانب {top_label}: {top_desc}. [[كما تشير إجاباتك إلى {trait_1}. ]]هذا جزء حقيقي من ملفك، لكنه جزء واحد فقط، فقيمك ونقاط قوتك في القسم التالي هي التي تحدد أي المسارات تأتي أولاً.',
    },
  },
  C3: {
    q: { en: 'What kind of careers suit people like me?', ar: 'ما المسارات المهنية التي تناسب أشخاصاً مثلي؟' },
    a: {
      en: 'People with a strong {top_label} interest often explore fields like {top_families}. Your {second_label} side can change which roles within those fields suit you best. Your full report checks this against your values and strengths and ranks the careers that fit you.',
      ar: 'أصحاب الاهتمام {top_label} القوي غالباً ما يستكشفون مجالات مثل {top_families}. والجانب {second_label} لديك قد يغيّر أي الأدوار داخل هذه المجالات هي الأنسب لك. تقريرك الكامل يقارن ذلك بقيمك ونقاط قوتك، ثم يرتّب المسارات المهنية الأنسب لك.',
    },
  },
  C7: {
    q: { en: 'Is the report worth it?', ar: 'هل يستحق التقرير؟' },
    a: {
      en: 'You’ve finished the first part. So far I can see your interests ({top_label} and {second_label}) and how you like to work. What I can’t see yet is what matters most to you and where your strengths are, and that’s what decides which careers fit you. For {price}, your report brings it all together: careers, what to study, and AI impact for each.',
      ar: 'أنهيت الجزء الأول. ما أراه حتى الآن هو اهتماماتك (الجانب {top_label} والجانب {second_label}) وأسلوبك المفضل في العمل. أما ما لا أراه بعد فهو ما يهمك أكثر وأين تكمن نقاط قوتك، وهذا تحديداً ما يحدد المسارات المناسبة لك. مقابل {price}، يجمع تقريرك كل ذلك: المسارات المهنية، وما يلزم دراسته، وأثر الذكاء الاصطناعي على كل منها.',
    },
  },
  H1: {
    q: { en: 'What should I study?', ar: 'ما التخصص المناسب لي؟' },
    a: {
      en: 'I can’t answer that honestly yet, and I won’t guess. Your interests point towards fields like {top_families}, but the right choice also depends on your values and strengths, which come next. Your full report shows the careers that fit you and what to study for each one.',
      ar: 'لا أستطيع الإجابة عن هذا بدقة الآن، ولن أخمّن. اهتماماتك تشير إلى مجالات مثل {top_families}، لكن الاختيار الصحيح يعتمد أيضاً على قيمك ونقاط قوتك، وهي في القسم التالي. تقريرك الكامل يوضح المسارات المهنية التي تناسبك وما يلزم دراسته لكل منها.',
    },
  },
  U1: {
    q: { en: 'What if my major doesn’t suit me?', ar: 'ماذا لو لم يكن تخصصي مناسباً لي؟' },
    a: {
      en: 'Then it’s far better to know now. Your interests lean towards {top_label}. Your full report shows the careers that fit you, including ones you can reach from your current field, so you’ll see your options either way.',
      ar: 'إذن من الأفضل بكثير أن تتضح الصورة الآن. اهتماماتك تميل نحو الجانب {top_label}، وتقريرك الكامل يوضح المسارات المهنية المناسبة لك، بما فيها مسارات يمكن الوصول إليها من تخصصك الحالي، فتتضح الخيارات في الحالتين.',
    },
  },
  G1: {
    q: { en: 'Where should I start applying?', ar: 'من أين أبدأ التقديم على الوظائف؟' },
    a: {
      en: 'Start where your profile is strongest. Your interests point to fields like {top_families}. Your full report narrows this to the careers that fit you best, with Gulf job market context and how AI is changing each one, so you can apply with focus.',
      ar: 'الأفضل أن تكون البداية حيث يكون ملفك أقوى. اهتماماتك تشير إلى مجالات مثل {top_families}، وتقريرك الكامل يحدد المسارات المهنية الأنسب لك، مع سياق سوق العمل الخليجي وأثر الذكاء الاصطناعي على كل منها، ليكون التقديم مركّزاً.',
    },
  },
  K3: {
    q: { en: 'What kind of work would suit me better?', ar: 'ما نوع العمل الذي قد يناسبني أكثر؟' },
    a: {
      en: 'Your answers show a clear {top_label} interest[[ and {trait_1}]]. If your current work doesn’t use [[those]][[that]], that may explain part of what you’re feeling. Your full report shows which careers do, ranked by how well they fit you.',
      ar: 'تُظهر إجاباتك اهتماماً واضحاً بالجانب {top_label}[[، إضافة إلى {trait_1}]]. إن كان عملك الحالي لا يستثمر ذلك، فقد يفسّر هذا جزءاً من شعورك. تقريرك الكامل يوضح المسارات التي تستثمره، مرتبة حسب درجة ملاءمتها لك.',
    },
  },
}

/** A template with its optional [[...]] parts kept only when the person has a work-style trait to mention. */
function applyTemplate(id: string, p: HintProfile, c: Ctx): Bi {
  const t = { q: ov(id + '.q', TEMPLATE[id].q), a: ov(id + '.a', TEMPLATE[id].a) }
  const keep = !!p.trait
  const strip = (x: string) => {
    // K3 English has "[[those]][[that]]": "those" when a trait was added, "that" when only the interest is mentioned.
    let out = x
    if (id === 'K3') out = out.replace(/\[\[those\]\]\[\[that\]\]/, keep ? 'those' : 'that')
    return out.replace(/\[\[(.*?)\]\]/g, (_m, inner) => (keep ? inner : ''))
  }
  return withProfile({ en: strip(t.a.en), ar: strip(t.a.ar) }, p, c)
}

/** C2 as a standalone line (used by 2-B2). */
export function gatePersonalSummary(p: HintProfile, c: Ctx): Bi { return applyTemplate('C2', p, c) }

export type GateBubble = Bi & { id: string; answer: Bi }

/** The question chips for the pay gate: the person's segment set first, then the shared ones (brief, ideas 2 + 16).
 *  Static answers need nothing; the personal ones (C2, C3, C7, H1, U1, G1, K3) appear once the interest scores exist.
 *  Held back until decisions are confirmed: C4 (the AI check), C5 (accuracy claim), C6 (privacy wording), H2 (the new parent button). */
export function gateBubbles(qo4: unknown, age: unknown, profile: HintProfile | null = null, c: Ctx = { name: '', price: '' }): GateBubble[] {
  const group: string[] =
    qo4 === 'high_school' ? ['H1', 'H3']
    : qo4 === 'university' ? ['U1', 'U2']
    : qo4 === 'recent_graduate' ? ['G1', 'G2']
    : qo4 === 'returning' || qo4 === 'between_roles' ? ['R1', 'R2']
    : qo4 === 'other' ? (Number(age) >= 23 ? ['K1', 'K2', 'K3'] : ['U1', 'U2'])
    : ['K1', 'K2', 'K3']   // working_exploring and career_changer
  const shared = ['C1', 'C2', 'C3', 'C7']
  const out: GateBubble[] = []
  for (const id of [...group, ...shared]) {
    if (TEMPLATE[id]) {
      if (!profile) continue
      out.push({ id, ...ov(id + '.q', TEMPLATE[id].q), answer: applyTemplate(id, profile, c) })
    } else {
      const b = id === 'C1' ? BUBBLE_C1 : BUBBLES[id]
      out.push({ id, ...ov(id + '.q', b.q), answer: ov(id + '.a', b.a) })
    }
  }
  return out
}

// ── Idea 2: what else the coach says at the pay gate ──
// 2-B1 (parents button) waits for the parent flow; 2-B4 (sample report) waits for decision 7; 2-B2 shows only its first
// half (what is in the report, C1), the score-based second half (C2) comes with the label logic.
const GATE_LINES: Record<string, Bi> = {
  '2-B3': {
    en: 'Your answers are saved. I’ll email you a link so you can continue whenever suits you.',
    ar: 'إجاباتك محفوظة، وسأرسل لك رابطاً عبر البريد لإكمال التقييم في أي وقت يناسبك.',
  },
  '2-B5': {
    en: 'Welcome back, {name}. Your results are still waiting for you.',
    ar: 'أهلاً بعودتك يا {name}. نتائجك ما زالت بانتظارك.',
  },
  '2-B6': {
    en: 'Any questions before you decide? I’m here.',
    ar: 'هل لديك أسئلة قبل اتخاذ القرار؟ أنا هنا.',
  },
}

export type GateCoachEvent = { type: 'exit_reason'; reason: string } | { type: 'idle' }

// 2-B1: someone leaving because they "need my parents" is offered the parent route.
const LINE_2B1_BASE: Bi = { en: 'Want me to send this to your parents so they can unlock it?', ar: 'هل أرسل هذا إلى أهلك ليتمكنوا من فتح التقرير؟' }
export const GATE_ACTION_LABEL = {
  parents: { en: 'Send to my parents', ar: 'إرسال إلى أهلي' } as Bi,
  unlock: { en: 'Unlock the full report', ar: 'فتح التقرير الكامل' } as Bi,
  another: { en: 'Ask another question', ar: 'سؤال آخر' } as Bi,
}

/** The coach line (message ID + text) for something that happened on the pay gate, or null for nothing to say.
 *  emailOk: the automatic reminder email is switched on, so 2-B3 may promise a link. */
export function gateEventLine(e: GateCoachEvent, name: string, emailOk: boolean, personal: Bi | null = null, canAskParent = false): { id: string; line: Bi; action?: 'parents' } | null {
  let id: string | null = null
  if (e.type === 'idle') id = '2-B6'
  else if (e.reason === 'later' || e.reason === 'too_expensive') id = emailOk ? '2-B3' : null
  else if (e.reason === 'not_sure_useful') {
    // 2-B2: what is in the report (C1), then what their own answers say (C2) when the scores exist.
    const c1 = ov('C1.a', BUBBLE_C1.a)
    const both = (l: 'en' | 'ar') => personal ? `${c1[l]}\n\n${personal[l]}` : c1[l]
    return { id: '2-B2', line: { en: both('en'), ar: both('ar') } }
  }
  else if (e.reason === 'need_parents') return canAskParent ? { id: '2-B1', line: ov('2-B1', LINE_2B1_BASE), action: 'parents' } : null
  if (!id) return null
  const m = ov(id, GATE_LINES[id])
  const fill = (t: string) => t.replace(/\{name\}/g, name)
  return { id, line: { en: fill(m.en), ar: fill(m.ar) } }
}

/** 2-B5: a returning person lands on the gate again. */
export function gateReturningLine(name: string): Bi {
  const m = ov('2-B5', GATE_LINES['2-B5'])
  const fill = (t: string) => t.replace(/\{name\}/g, name)
  return { en: fill(m.en), ar: fill(m.ar) }
}


// ── Pay screen headline per group (3 Nov review, point 4: sell the decision, not the report) ──
// The brief's copy rules apply: the report recommends careers and what to study for each, never "a list of majors"; no "free".
// Students, graduates and working adults each get the decision they came for. Editable in Admin under GATE-HEAD-<group>.
const GATE_HEADS: Record<string, Bi> = {
  HS: { en: 'Your full report: the careers that fit you, and what to study for each one',
        ar: 'تقريرك الكامل: المسارات المهنية الأنسب لك، وما يلزم دراسته لكل مسار' },
  UNI: { en: 'Your full report: the careers that fit you, including ones you can reach from your current degree',
         ar: 'تقريرك الكامل: المسارات المهنية الأنسب لك، بما فيها مسارات يمكن الوصول إليها من تخصصك الحالي' },
  GRAD: { en: 'Your full report: where to start applying, with the careers that fit you and Gulf job market context',
          ar: 'تقريرك الكامل: من أين تبدأ التقديم، والمسارات الأنسب لك مع سياق سوق العمل الخليجي' },
  CHG: { en: 'Find the right next role: your full career report with best-fit roles, AI impact and a 90-day plan',
         ar: 'اعثر على وظيفتك القادمة المناسبة: تقريرك المهني الكامل بأنسب الوظائف لك، وتأثير الذكاء الاصطناعي عليها، وخطة 90 يوم' },
}
function headGroup(qo4: unknown, age: unknown): string {
  if (qo4 === 'high_school') return 'HS'
  if (qo4 === 'university') return 'UNI'
  if (qo4 === 'recent_graduate') return 'GRAD'
  if (qo4 === 'other') return Number(age) >= 23 ? 'CHG' : 'UNI'
  return 'CHG'   // working, changing careers, returning, between jobs
}
/** The pay screen's main headline for this person, in the given language. */
export function gateHeadline(qo4: unknown, age: unknown, locale: 'en' | 'ar'): string {
  const g = headGroup(qo4, age)
  return ov('GATE-HEAD-' + g, GATE_HEADS[g])[locale]
}

/** Every editable line with its built-in wording, for the Admin table. `group` is for filtering. */
export function scriptCatalogue(): { id: string; group: string; label: string; en: string; ar: string }[] {
  const rows: { id: string; group: string; label: string; en: string; ar: string }[] = []
  for (const [id, b] of Object.entries(COACH_SCRIPT)) {
    const group = id.startsWith('17-G-') ? 'Goal replies' : id.startsWith('17-') ? 'Welcome' : 'During the assessment'
    rows.push({ id, group, label: id, ...b })
  }
  rows.push({ id: '16-ALL-00', group: 'Pay gate', label: 'Opening line', en: '{name}, I’ve looked at your answers. Your strongest interest is {top_label}, and it combines with {second_label} in an interesting way. Ask me about it.', ar: '{name}، اطّلعت على إجاباتك. أقوى اهتماماتك هو الجانب {top_label}، ويترابط مع الجانب {second_label} بطريقة لافتة. يمكنك سؤالي عن ذلك.' })
  for (const [id, b] of Object.entries(GATE_LINES)) rows.push({ id, group: 'Pay gate', label: id, ...b })
  rows.push({ id: '2-B1', group: 'Pay gate', label: '2-B1', ...LINE_2B1_BASE })
  for (const [g, b] of Object.entries(GATE_HEADS)) rows.push({ id: 'GATE-HEAD-' + g, group: 'Pay screen headline', label: 'Headline for ' + g, ...b })
  const bubbleRows = (id: string, q: Bi, a: Bi) => {
    rows.push({ id: id + '.q', group: 'Pay gate questions', label: id + ' question', ...q })
    rows.push({ id: id + '.a', group: 'Pay gate questions', label: id + ' answer', ...a })
  }
  bubbleRows('C1', BUBBLE_C1.q, BUBBLE_C1.a)
  for (const [id, b] of Object.entries(BUBBLES)) bubbleRows(id, b.q, b.a)
  for (const [id, b] of Object.entries(TEMPLATE)) bubbleRows(id, b.q, b.a)
  return rows
}
