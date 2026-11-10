// Scripted coach lines from the "Etijahi Pay Gate: IT Implementation Brief" (10 Nov 2026).
// One string table keyed by message ID (idea-segment-number), so content can be matched back to the brief and later moved
// to Admin without touching the code that uses it. Placeholders in {curly brackets} are filled by fillScript().
// Copy rules from the brief: Arabic is gender-neutral on purpose (do not "fix" it), no em dashes, never "free" / مجاناً.
import type { Bi } from '@/data/coachMessages'

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
  const m = COACH_SCRIPT[id]
  if (!m) return null
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

/** The static question chips for the pay gate: the person's segment set first, then the shared one (brief, ideas 2 + 16). */
export function gateBubbles(qo4: unknown, age: unknown): (Bi & { answer: Bi })[] {
  const byGroup: string[] =
    qo4 === 'high_school' ? ['H3']
    : qo4 === 'university' ? ['U2']
    : qo4 === 'recent_graduate' ? ['G2']
    : qo4 === 'returning' || qo4 === 'between_roles' ? ['R1', 'R2']
    : qo4 === 'other' ? (Number(age) >= 23 ? ['K1', 'K2'] : ['U2'])
    : ['K1', 'K2']   // working_exploring and career_changer
  return [...byGroup.map(id => BUBBLES[id]), BUBBLE_C1].map(b => ({ ...b.q, answer: b.a }))
}
