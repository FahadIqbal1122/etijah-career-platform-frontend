// revealScoring.ts — lightweight, client-side leaning used ONLY to personalise
// the in-assessment "reveal" moments. It mirrors the backend scoring map so the
// reveals reflect the user's actual choices; the authoritative scoring + final
// report still come from the backend (etijah-career-platform-backend/scoring_engine.py).
// If the backend map changes, update this file to match.

type FrameworkKey = 'riasec' | 'big_five' | 'values' | 'strengths' | 'resilience' | 'work_style' | 'entrepreneurship'

const FORCED_CHOICE_SCORES: Record<string, Record<string, number>> = {
  Q6: { A: 5, B: 3 },
  Q17: { A: 6, B: 1 },
  Q36: { A: 6, B: 1 },
  Q38: { A: 6, B: 1 },
  Q40: { A: 6, B: 1 },
  Q59: { A: 1, B: 6 },
  Q60: { A: 1, B: 4, C: 6 },
  Q61: { A: 1, B: 2, C: 4, D: 6 },
  Q64: { A: 1, B: 6, C: 4 },
  Q65: { A: 6, B: 1 },
  Q66: { A: 1, B: 6 },
  Q67: { A: 1, B: 6 },
  Q71: { A: 6, B: 1 },
  QFC_RI: { A: 5, B: 1 },
  QFC_SE: { A: 5, B: 1 },
}

const REVERSE_SCORED = new Set(['Q21', 'Q22'])

// question id → [framework, dimension]  (ported from backend QUESTION_MAP)
const QUESTION_MAP: Record<string, [FrameworkKey, string]> = {
  Q1: ['riasec', 'realistic'], Q2: ['riasec', 'realistic'],
  Q3: ['riasec', 'investigative'], Q4: ['riasec', 'investigative'],
  Q5: ['riasec', 'artistic'], Q6: ['riasec', 'artistic'],
  Q7: ['riasec', 'social'], Q8: ['riasec', 'social'],
  Q9: ['riasec', 'enterprising'], Q10: ['riasec', 'enterprising'],
  Q11: ['riasec', 'conventional'], Q12: ['riasec', 'conventional'],
  QFC_RI: ['riasec', 'realistic'], QFC_SE: ['riasec', 'social'],
  Q13: ['big_five', 'openness'], Q14: ['big_five', 'openness'],
  Q15: ['big_five', 'conscientiousness'], Q16: ['big_five', 'conscientiousness'],
  Q17: ['big_five', 'extraversion'], Q18: ['big_five', 'extraversion'],
  Q19: ['big_five', 'agreeableness'], Q20: ['big_five', 'agreeableness'],
  Q21: ['big_five', 'stability'], Q22: ['big_five', 'stability'],
  Q23: ['values', 'security'], Q24: ['values', 'security'],
  Q25: ['values', 'freedom'], Q26: ['values', 'freedom'],
  Q27: ['values', 'impact'], Q28: ['values', 'impact'],
  Q29: ['values', 'status'], Q30: ['values', 'status'],
  Q31: ['values', 'family'], Q32: ['values', 'family'],
  Q33: ['values', 'creativity'], Q34: ['values', 'creativity'],
  Q35: ['values', 'wealth'], Q36: ['values', 'wealth'],
  Q37: ['values', 'national_contribution'], Q38: ['values', 'national_contribution'],
  Q39: ['values', 'reputation'], Q40: ['values', 'reputation'],
  Q41: ['strengths', 'strategic'], Q42: ['strengths', 'strategic'],
  Q43: ['strengths', 'leadership'], Q44: ['strengths', 'leadership'],
  Q45: ['strengths', 'relationships'], Q46: ['strengths', 'relationships'],
  Q47: ['strengths', 'execution'], Q48: ['strengths', 'execution'],
  Q49: ['strengths', 'communication'], Q50: ['strengths', 'communication'],
  Q51: ['strengths', 'learning'], Q52: ['strengths', 'learning'],
  Q53: ['resilience', 'long_term_focus'], Q54: ['resilience', 'long_term_focus'],
  Q55: ['resilience', 'long_term_focus'], Q56: ['resilience', 'long_term_focus'],
  Q57: ['resilience', 'long_term_focus'],
  Q59: ['resilience', 'workplace_resilience'], Q60: ['resilience', 'workplace_resilience'],
  Q61: ['resilience', 'workplace_resilience'], Q64: ['resilience', 'workplace_resilience'],
  Q65: ['work_style', 'pace'], Q66: ['work_style', 'environment'],
  Q67: ['work_style', 'sector'], Q68: ['work_style', 'mobility'],
  Q69: ['entrepreneurship', 'prior_experience'],
  Q71: ['entrepreneurship', 'risk_tolerance'],
  Q73: ['entrepreneurship', 'portfolio_interest'],
}

export function frameworkOf(id: string): FrameworkKey | null {
  return QUESTION_MAP[id]?.[0] ?? null
}

function scoreAnswer(id: string, raw: any): number {
  if (id in FORCED_CHOICE_SCORES) return FORCED_CHOICE_SCORES[id][String(raw)] ?? 0
  let score = Number(raw)
  if (!Number.isFinite(score)) return 0
  if (REVERSE_SCORED.has(id)) score = 7 - score
  return score
}

type Leaning = { dimension: string; score: number; margin: number }

// Top dimension within one framework, from the answers gathered so far.
export function computeLeaning(answers: Record<string, any>, framework: FrameworkKey): Leaning | null {
  const acc: Record<string, { sum: number; n: number }> = {}
  for (const id of Object.keys(answers)) {
    const entry = QUESTION_MAP[id]
    if (!entry || entry[0] !== framework) continue
    const [, dim] = entry
    const v = answers[id]
    if (v === undefined || v === null || v === '') continue
    if (!acc[dim]) acc[dim] = { sum: 0, n: 0 }
    acc[dim].sum += scoreAnswer(id, v)
    acc[dim].n += 1
  }
  const ranked = Object.entries(acc)
    .map(([dimension, { sum, n }]) => ({ dimension, score: sum / n }))
    .sort((a, b) => b.score - a.score)
  if (ranked.length === 0) return null
  const margin = ranked.length > 1 ? ranked[0].score - ranked[1].score : ranked[0].score
  return { dimension: ranked[0].dimension, score: ranked[0].score, margin }
}

// Frameworks that trigger a reveal, in the order they appear. Kept to the three
// most "personality reveal"-worthy blocks (mirrors the prototype's 3 reveals).
export const REVEAL_FRAMEWORKS: FrameworkKey[] = ['riasec', 'values', 'strengths']

type Msg = { head: string; body: string }

// Neutral fallback when the top dimension isn't clearly ahead (near-tie / low signal).
const NEUTRAL: Record<string, Msg> = {
  en: { head: 'A clear shape is forming.', body: 'Your answers are painting a rich, balanced picture. Keep going — the full reading is next.' },
  ar: { head: 'بدأت ملامح واضحة تتشكّل.', body: 'إجاباتك ترسم صورة غنية ومتوازنة. أكمل — القراءة الكاملة تنتظرك.' },
}

// head/body per top dimension, phrased "so far" so it stays truthful vs. the
// final backend report.
const BANK: Record<FrameworkKey, Record<string, Record<string, Msg>>> = {
  riasec: {
    realistic: { en: { head: 'You’re a builder at heart.', body: 'So far you lean hands-on and practical — you’d rather make it work than just talk about it.' }, ar: { head: 'أنت صانعٌ في جوهرك.', body: 'حتى الآن تميل إلى العمل اليدوي والعملي — تفضّل أن تنجزه لا أن تتحدّث عنه فقط.' } },
    investigative: { en: { head: 'You think like an investigator.', body: 'So far you lean analytical and curious — you’re drawn to problems worth solving.' }, ar: { head: 'تفكّر كباحثٍ مدقّق.', body: 'حتى الآن تميل إلى التحليل والفضول — تنجذب إلى المشكلات التي تستحق الحل.' } },
    artistic: { en: { head: 'You lead with originality.', body: 'So far you lean creative and expressive — you like room to make something your own.' }, ar: { head: 'تقود بأصالتك.', body: 'حتى الآن تميل إلى الإبداع والتعبير — تحب مساحةً تصنع فيها شيئاً خاصاً بك.' } },
    social: { en: { head: 'You’re drawn to people.', body: 'So far you lean toward helping and connecting — you do your best work alongside others.' }, ar: { head: 'تنجذب إلى الناس.', body: 'حتى الآن تميل إلى المساعدة والتواصل — تبلغ أفضل حالاتك مع الآخرين.' } },
    enterprising: { en: { head: 'You’re the one who takes charge.', body: 'So far you lean toward leading and persuading — you like setting the direction.' }, ar: { head: 'أنت من يتولّى القيادة.', body: 'حتى الآن تميل إلى القيادة والإقناع — تحب أن تحدّد الاتجاه.' } },
    conventional: { en: { head: 'You bring order to things.', body: 'So far you lean toward structure and precision — you make the messy run smoothly.' }, ar: { head: 'تجلب النظام إلى الأمور.', body: 'حتى الآن تميل إلى التنظيم والدقّة — تجعل الفوضى تسير بسلاسة.' } },
  },
  values: {
    security: { en: { head: 'Stability matters to you.', body: 'So far you value security and steadiness — you want a foundation you can build on.' }, ar: { head: 'الاستقرار يهمّك.', body: 'حتى الآن تقدّر الأمان والثبات — تريد أساساً تبني عليه.' } },
    freedom: { en: { head: 'You value your freedom.', body: 'So far you’re drawn to autonomy — you want space to do things your way.' }, ar: { head: 'تقدّر حريتك.', body: 'حتى الآن تنجذب إلى الاستقلالية — تريد مساحةً لتعمل بطريقتك.' } },
    impact: { en: { head: 'You want your work to matter.', body: 'So far you value impact — doing work that genuinely helps people means a lot to you.' }, ar: { head: 'تريد لعملك أن يكون ذا معنى.', body: 'حتى الآن تقدّر الأثر — العمل الذي يفيد الناس حقاً يعني لك الكثير.' } },
    status: { en: { head: 'You aim high.', body: 'So far you value recognition and growth — you want a path that keeps rising.' }, ar: { head: 'تطمح إلى العلا.', body: 'حتى الآن تقدّر التقدير والنمو — تريد مساراً يواصل الصعود.' } },
    family: { en: { head: 'The people close to you come first.', body: 'So far you value family and balance — work is part of a bigger life, not all of it.' }, ar: { head: 'المقرّبون منك أولاً.', body: 'حتى الآن تقدّر العائلة والتوازن — العمل جزء من حياة أكبر، لا كلّها.' } },
    creativity: { en: { head: 'You need room to create.', body: 'So far you value originality — you’re happiest when you can make something new.' }, ar: { head: 'تحتاج مساحةً للإبداع.', body: 'حتى الآن تقدّر الأصالة — أسعد ما تكون حين تصنع شيئاً جديداً.' } },
    wealth: { en: { head: 'You’re building toward more.', body: 'So far you value financial reward — you want your effort to pay off tangibly.' }, ar: { head: 'تبني نحو المزيد.', body: 'حتى الآن تقدّر العائد المالي — تريد لجهدك أن يثمر بشكل ملموس.' } },
    national_contribution: { en: { head: 'You want to give back.', body: 'So far you value contributing to your community and country — purpose beyond the paycheck.' }, ar: { head: 'تريد أن تردّ الجميل.', body: 'حتى الآن تقدّر الإسهام في مجتمعك ووطنك — غايةٌ تتجاوز الراتب.' } },
    reputation: { en: { head: 'Your name means something.', body: 'So far you value reputation and trust — you want to be known for doing things right.' }, ar: { head: 'اسمك يعني شيئاً.', body: 'حتى الآن تقدّر السمعة والثقة — تريد أن تُعرف بإتقان ما تفعل.' } },
  },
  strengths: {
    strategic: { en: { head: 'You see the whole board.', body: 'So far your standout strength is strategy — you connect the dots others miss.' }, ar: { head: 'ترى الصورة كاملة.', body: 'حتى الآن أبرز نقاط قوتك هي الاستراتيجية — تربط ما يغفل عنه الآخرون.' } },
    leadership: { en: { head: 'People follow your lead.', body: 'So far your standout strength is leadership — you bring direction and momentum.' }, ar: { head: 'الناس يتبعون قيادتك.', body: 'حتى الآن أبرز نقاط قوتك هي القيادة — تجلب الاتجاه والزخم.' } },
    relationships: { en: { head: 'You build real connections.', body: 'So far your standout strength is relationships — people trust and open up to you.' }, ar: { head: 'تبني علاقاتٍ حقيقية.', body: 'حتى الآن أبرز نقاط قوتك هي العلاقات — يثق بك الناس وينفتحون عليك.' } },
    execution: { en: { head: 'You get things done.', body: 'So far your standout strength is execution — you turn plans into finished work.' }, ar: { head: 'تُنجز الأمور.', body: 'حتى الآن أبرز نقاط قوتك هي التنفيذ — تحوّل الخطط إلى عمل مكتمل.' } },
    communication: { en: { head: 'You make ideas land.', body: 'So far your standout strength is communication — you explain and persuade with clarity.' }, ar: { head: 'تجعل الأفكار تصل.', body: 'حتى الآن أبرز نقاط قوتك هي التواصل — تشرح وتُقنع بوضوح.' } },
    learning: { en: { head: 'You’re built to grow.', body: 'So far your standout strength is learning — you pick things up fast and keep improving.' }, ar: { head: 'مجبولٌ على النمو.', body: 'حتى الآن أبرز نقاط قوتك هي التعلّم — تلتقط بسرعة وتواصل التحسّن.' } },
  },
  big_five: {}, resilience: {}, work_style: {}, entrepreneurship: {},
}

// Build the reveal message for a framework from the answers so far.
export function buildReveal(answers: Record<string, any>, framework: FrameworkKey, locale: string): Msg {
  const lang = locale === 'ar' ? 'ar' : 'en'
  const leaning = computeLeaning(answers, framework)
  // low signal or near-tie → neutral, honest fallback
  if (!leaning || leaning.margin < 0.4) return NEUTRAL[lang]
  const msg = BANK[framework]?.[leaning.dimension]?.[lang]
  return msg ?? NEUTRAL[lang]
}
