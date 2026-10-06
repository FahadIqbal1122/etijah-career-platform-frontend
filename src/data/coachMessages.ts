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
