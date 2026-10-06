// One-way "coach" bubble copy. Ambient, not assessment content — inline bilingual
// objects, same precedent as breakActivities.ts.
export interface Bi { en: string; ar: string }

export const COACH_BREAK: Bi[] = [
  { en: 'Feel free to take a short break. Your answers are saved.', ar: 'خذ استراحة قصيرة إن أردت، إجاباتك محفوظة.' },
  { en: 'Stretch your shoulders and take a deep breath, then carry on.', ar: 'مدّد كتفيك وخذ نفساً عميقاً ثم أكمل.' },
  { en: 'A sip of water goes a long way. We will be here.', ar: 'رشفة ماء تصنع فرقاً. سنكون هنا بانتظارك.' },
]

export const COACH_MOTIVATION: Bi[] = [
  { en: 'There are no right or wrong answers, just be honest.', ar: 'لا توجد إجابات صحيحة أو خاطئة، كن صادقاً فقط.' },
  { en: 'Your first instinct is usually the most accurate one.', ar: 'انطباعك الأول هو غالباً الأدق.' },
  { en: 'You are doing great. Every answer sharpens your picture.', ar: 'أنت تبلي بلاءً حسناً. كل إجابة توضّح صورتك أكثر.' },
  { en: 'Taking time to know yourself is a real investment.', ar: 'أخذ الوقت لفهم نفسك استثمار حقيقي.' },
]

// Shown when Sarah comes to the middle of the green reveal screen between question blocks.
export const COACH_REVEAL: Bi[] = [
  { en: 'You are doing great. Every answer is building your personal picture.', ar: 'أنت تبلي بلاءً حسناً. كل إجابة تبني صورتك الشخصية.' },
  { en: 'Nice work! Take a breath, then keep going.', ar: 'عمل رائع! خذ نفساً عميقاً ثم واصل.' },
  { en: 'Being honest with yourself is exactly what makes your results accurate.', ar: 'صدقك مع نفسك هو ما يجعل نتائجك دقيقة.' },
  { en: 'A real pattern is starting to show. I can’t wait for you to see it.', ar: 'بدأ نمط حقيقي بالظهور. متحمسة لأن تراه.' },
]

// Results-page advice, built from the user's own results.
export function resultsAdvice(p: {
  topType: string; topStrength: string; resilience?: number
}): Bi[] {
  const out: Bi[] = [
    {
      en: `Your strongest career type is ${p.topType}. Start with the careers tagged to it and compare how each one feels.`,
      ar: `نمطك المهني الأقوى هو ${p.topType}. ابدأ بالمهن المرتبطة به وقارن بينها.`,
    },
    {
      en: `${p.topStrength} is a standout strength. Look for roles and projects where you can use it daily.`,
      ar: `${p.topStrength} نقطة قوة بارزة لديك. ابحث عن أدوار ومشاريع تستخدمها فيها يومياً.`,
    },
  ]
  if (typeof p.resilience === 'number' && p.resilience < 50) {
    out.push({
      en: 'Build support around you. A mentor or a peer group will make hard stretches easier.',
      ar: 'ابنِ حولك دعماً: مرشد أو مجموعة أقران يجعلان الفترات الصعبة أسهل.',
    })
  }
  return out
}

// Landing page: quick questions shown as chips in Sarah's panel, and the one-time nudge in her bubble.
export const LANDING_SUGGESTIONS: Bi[] = [
  { en: 'How long does it take?', ar: 'كم يستغرق التقييم؟' },
  { en: 'What do I get for free?', ar: 'ماذا أحصل عليه مجاناً؟' },
  { en: 'What do the plans cost?', ar: 'كم تكلفة الباقات؟' },
  { en: 'Is my data private?', ar: 'هل بياناتي خاصة؟' },
]
export const LANDING_NUDGE: Bi = {
  en: 'Questions about how it works or pricing? Ask me.',
  ar: 'عندك سؤال عن طريقة العمل أو الأسعار؟ اسألني.',
}

// Results page: short comments Sarah makes as she moves between sections of the report. Keyed by the section's
// data-coach name. Every line only uses the reader's own results (no outside facts); a line that needs a value
// the report does not have is left out. She picks at random, so the order and wording change on every visit.
export interface RoamCtx {
  topType?: string; secondType?: string; topValue?: string; topStrength?: string
  topCareer?: string; topCareerMatch?: number; careerCount?: number
  courseCount?: number; companyCount?: number; resilience?: number
}

export function roamPool(c: RoamCtx): Record<string, Bi[]> {
  const out: Record<string, Bi[]> = {}
  const add = (k: string, ...lines: (Bi | false | undefined | '')[]) => {
    out[k] = [...(out[k] ?? []), ...lines.filter((l): l is Bi => !!l)]
  }
  add('summary',
    { en: 'Start here. This is the short version of you.', ar: 'ابدأ من هنا. هذه هي النسخة المختصرة عنك.' },
    !!c.topType && { en: `${c.topType} came out on top for you. Keep it in mind as you read on.`, ar: `${c.topType} جاء في المقدمة عندك. ضعه في بالك وأنت تقرأ.` },
    !!c.topStrength && { en: `${c.topStrength} is your standout strength. Nice one.`, ar: `${c.topStrength} هي أبرز نقاط قوتك. أحسنت.` },
    !!c.topValue && { en: `What matters most to you at work: ${c.topValue}.`, ar: `أهم ما يعنيك في العمل: ${c.topValue}.` },
  )
  add('careers',
    !!c.topCareer && { en: `Your best career match is ${c.topCareer}${c.topCareerMatch ? `, at ${c.topCareerMatch}%` : ''}.`, ar: `أفضل مهنة تناسبك هي ${c.topCareer}${c.topCareerMatch ? `، بنسبة ${c.topCareerMatch}%` : ''}.` },
    !!c.topCareer && !!c.topType && { en: `${c.topCareer} fits your ${c.topType} side. Open it and see why.`, ar: `${c.topCareer} تناسب جانبك ${c.topType}. افتحها وانظر لماذا.` },
    !!c.careerCount && c.careerCount > 1 && { en: `These ${c.careerCount} careers were picked from your profile. Compare how each one feels.`, ar: `هذه المهن الـ${c.careerCount} اختيرت من ملفك. قارن بينها وانظر أيها يريحك.` },
    { en: 'Your profile matches these jobs. Tell me if one surprises you.', ar: 'ملفك يتوافق مع هذه الوظائف. أخبرني إن فاجأتك واحدة منها.' },
  )
  add('plan',
    { en: 'This is your plan. Start with the very first step, it is small on purpose.', ar: 'هذه خطتك. ابدأ بالخطوة الأولى، هي صغيرة عن قصد.' },
    { en: 'A plan only works if you start it. Pick day one and begin.', ar: 'الخطة لا تنفع إلا إذا بدأتها. اختر اليوم الأول وابدأ.' },
    !!c.topCareer && { en: `Everything here is built around ${c.topCareer}.`, ar: `كل ما هنا مبني حول ${c.topCareer}.` },
  )
  add('majors',
    { en: 'Thinking about what to study? These are the majors that fit you.', ar: 'تفكر ماذا تدرس؟ هذه التخصصات التي تناسبك.' },
    !!c.topType && { en: `With a ${c.topType} profile, these majors are worth a close look.`, ar: `بنمط ${c.topType}، هذه التخصصات تستحق نظرة قريبة.` },
  )
  add('path',
    { en: 'This is the road from where you are to where you want to be.', ar: 'هذا هو الطريق من حيث أنت إلى حيث تريد أن تكون.' },
    { en: 'Small steps, in this order. You do not need to do it all at once.', ar: 'خطوات صغيرة بهذا الترتيب. لا يلزمك أن تفعل كل شيء دفعة واحدة.' },
  )
  add('jobs',
    { en: 'Real openings that line up with your results.', ar: 'فرص حقيقية تتوافق مع نتائجك.' },
    !!c.topCareer && { en: `Look for roles close to ${c.topCareer}. Save the ones you like.`, ar: `ابحث عن أدوار قريبة من ${c.topCareer}. واحفظ ما يعجبك.` },
  )
  add('certs',
    { en: 'A certificate can open a door. These are the ones that fit your path.', ar: 'الشهادة قد تفتح باباً. هذه الأنسب لمسارك.' },
    !!c.topCareer && { en: `These certifications help most for ${c.topCareer}.`, ar: `هذه الشهادات الأكثر فائدة لمهنة ${c.topCareer}.` },
  )
  add('courses',
    !!c.courseCount && { en: `${c.courseCount} courses chosen for you. Start with a free one.`, ar: `${c.courseCount} دورات اختيرت لك. ابدأ بدورة مجانية.` },
    !!c.topStrength && { en: `Courses are where ${c.topStrength} turns into skill. Pick one and start this week.`, ar: `الدورات هي حيث تتحول ${c.topStrength} إلى مهارة. اختر واحدة وابدأ هذا الأسبوع.` },
    { en: 'You do not need all of them. One course finished beats five started.', ar: 'لا تحتاج إليها كلها. دورة واحدة تكملها خير من خمس تبدؤها.' },
  )
  add('companies',
    !!c.companyCount && { en: `${c.companyCount} companies worth a look for your profile.`, ar: `${c.companyCount} شركات تستحق النظر لملفك.` },
    { en: 'These companies hire people like you. Follow a few and watch what they post.', ar: 'هذه الشركات توظّف أشخاصاً مثلك. تابع بعضها وراقب ما تنشره.' },
  )
  add('ai',
    { en: 'AI is changing every job. Here is what it means for yours.', ar: 'الذكاء الاصطناعي يغيّر كل وظيفة. هذا ما يعنيه لوظيفتك.' },
    { en: 'The skills listed here are the ones to grow so you stay ahead of the change.', ar: 'المهارات المذكورة هنا هي التي تنميها لتبقى سباقاً للتغيير.' },
  )
  add('types',
    !!c.topType && { en: `${c.topType} is your highest type${c.secondType ? `, then ${c.secondType}` : ''}. That mix is yours alone.`, ar: `${c.topType} هو أعلى أنماطك${c.secondType ? `، ثم ${c.secondType}` : ''}. هذا المزيج لك وحدك.` },
    { en: 'No type is better than another. This is just where your interests point.', ar: 'ليس هناك نمط أفضل من آخر. هذا فقط ما تميل إليه اهتماماتك.' },
  )
  add('values',
    !!c.topValue && { en: `${c.topValue} matters most to you. Look for a workplace that offers it.`, ar: `${c.topValue} هو الأهم عندك. ابحث عن مكان عمل يوفره.` },
    { en: 'Your values decide whether a good job also feels right.', ar: 'قيمك هي ما يجعل الوظيفة الجيدة تشعرك بأنها مناسبة أيضاً.' },
  )
  add('strengths',
    !!c.topStrength && { en: `${c.topStrength} is a real strength. Use it every day if you can.`, ar: `${c.topStrength} نقطة قوة حقيقية. استخدمها كل يوم إن استطعت.` },
    { en: 'These are what you bring to a team. Put them in your CV and your interviews.', ar: 'هذا ما تقدمه لأي فريق. اذكره في سيرتك الذاتية ومقابلاتك.' },
  )
  add('personality',
    { en: 'This is how you tend to work and react. There is no good or bad score here.', ar: 'هكذا تميل إلى العمل والتفاعل. لا توجد درجة جيدة أو سيئة هنا.' },
    { en: 'Know your style, and you can pick the work that suits it.', ar: 'اعرف أسلوبك وستختار العمل الذي يناسبه.' },
  )
  add('workstyle',
    { en: 'Pace, environment, sector, mobility. This is the kind of workplace that suits you.', ar: 'الوتيرة والبيئة والقطاع والتنقل. هذا هو مكان العمل الذي يناسبك.' },
    typeof c.resilience === 'number' && c.resilience >= 50 && { en: 'Your resilience looks solid. Hard stretches will not knock you off course.', ar: 'مرونتك تبدو قوية. الفترات الصعبة لن تُخرجك عن مسارك.' },
    typeof c.resilience === 'number' && c.resilience < 50 && { en: 'Build some support around you, a mentor or a peer group. It makes hard stretches easier.', ar: 'ابنِ حولك دعماً، مرشداً أو مجموعة أقران. هذا يسهّل الفترات الصعبة.' },
  )
  return out
}

// Landing page: what Sarah says as she moves down the page (keys = data-coach names on the sections). Only
// facts the page itself states; random order and wording like on the results page.
export const LANDING_ROAM: Record<string, Bi[]> = {
  hero: [
    { en: 'Hi, I’m Sarah. Welcome! Take a look around.', ar: 'مرحباً، أنا سارة. أهلاً بك! تفضل بالتجول.' },
    { en: 'The assessment takes about 12–15 minutes, and starting is free.', ar: 'التقييم يستغرق نحو 12–15 دقيقة، والبدء مجاني.' },
    { en: 'No right or wrong answers here. Just be honest.', ar: 'لا توجد إجابات صحيحة أو خاطئة هنا. كن صادقاً فقط.' },
  ],
  what: [
    { en: 'Etijahi is built by career coaches with 15 years of experience across the GCC.', ar: 'اتجاهي من تصميم مدرّبين مهنيين بخبرة 15 عاماً في دول الخليج.' },
    { en: 'It looks at you from five angles: interests, values, strengths, personality and work style.', ar: 'ينظر إليك من خمس زوايا: الاهتمامات والقيم ونقاط القوة والشخصية وأسلوب العمل.' },
  ],
  how: [
    { en: 'Three simple steps. You can do the first one right now, for free.', ar: 'ثلاث خطوات بسيطة. يمكنك البدء بالأولى الآن مجاناً.' },
    { en: 'It is available in Arabic and English, and so is the report.', ar: 'متوفر بالعربية والإنجليزية، وكذلك التقرير.' },
  ],
  report: [
    { en: 'This is what your report looks like. Curious about any part? Just ask me.', ar: 'هكذا يبدو تقريرك. فضولي بشأن جزء منه؟ اسألني.' },
    { en: 'You can read it online and download it as a PDF.', ar: 'يمكنك قراءته على الإنترنت وتنزيله بصيغة PDF.' },
  ],
  gulf: [
    { en: 'Built for the whole GCC, with career context for each market.', ar: 'مصمم لدول الخليج كلها، مع سياق مهني لكل سوق.' },
  ],
  who: [
    { en: 'Students, professionals, career changers. If you are wondering what is next, this is for you.', ar: 'طلاب ومهنيون ومغيّرو مسار. إن كنت تتساءل عن خطوتك التالية فهذا لك.' },
    { en: 'Your results belong to you, and your data is never sold.', ar: 'نتائجك ملك لك، وبياناتك لا تُباع أبداً.' },
  ],
  pricing: [
    { en: 'Not sure which plan is right for you? Tell me a bit about what you need.', ar: 'لست متأكداً أي باقة تناسبك؟ أخبرني قليلاً عما تحتاجه.' },
    { en: 'Explorer is free, and the paid plans are one-time payments. Want help choosing?', ar: 'Explorer مجانية، والباقات المدفوعة دفعة واحدة. تريد مساعدة في الاختيار؟' },
    { en: 'Choosing a plan? I can help you pick in two taps.', ar: 'تختار باقة؟ أستطيع مساعدتك في الاختيار بنقرتين.' },
  ],
}

// Shown as buttons in her bubble when she stops at the plans: each one opens the chat and asks that question.
export const PLAN_CHOICES: { label: Bi; ask: Bi }[] = [
  { label: { en: 'Just exploring', ar: 'أستكشف فقط' }, ask: { en: 'I’m just exploring. Which plan fits me?', ar: 'أنا أستكشف فقط. أي باقة تناسبني؟' } },
  { label: { en: 'I want the full plan', ar: 'أريد الخطة الكاملة' }, ask: { en: 'I want the full plan and live job listings. Which plan fits me?', ar: 'أريد الخطة الكاملة وقوائم الوظائف الحية. أي باقة تناسبني؟' } },
  { label: { en: 'I want a coach', ar: 'أريد مدرّباً' }, ask: { en: 'I want to talk my results through with a coach. Which plan fits me?', ar: 'أريد مناقشة نتائجي مع مدرّب. أي باقة تناسبني؟' } },
]
