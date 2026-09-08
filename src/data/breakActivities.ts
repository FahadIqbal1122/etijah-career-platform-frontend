// Ambient, opt-in "break" content for the assessment aside panel (desktop
// only). Throwaway/ambient copy, not assessment content — kept as inline
// objects rather than added to messages/en.json & ar.json, following the
// precedent set by CHROME/ENCOURAGEMENT in AssessmentForm.tsx and
// src/components/beta-feedback/content.ts.

export interface Bi { en: string; ar: string }

// Discriminated union — BreakPanel switches on `kind` and picks one at
// random each time "Take a break" (or "Something else") is pressed.
export type BreakActivity =
  | { kind: 'riddle' }
  | { kind: 'tic_tac_toe' }
  | { kind: 'rps' }
  | { kind: 'memory_match' }

export const ACTIVITY_LABELS: Record<BreakActivity['kind'], Bi> = {
  riddle: { en: 'Quick riddle', ar: 'لغز سريع' },
  tic_tac_toe: { en: 'Tic-tac-toe', ar: 'إكس أو' },
  rps: { en: 'Rock, Paper, Scissors', ar: 'حجر ورقة مقص' },
  memory_match: { en: 'Memory match', ar: 'لعبة الذاكرة' },
}

export interface Riddle { id: string; prompt: Bi; answer: Bi }

export const RIDDLES: Riddle[] = [
  {
    id: 'r1',
    prompt: { en: 'The more you take, the more you leave behind. What am I?', ar: 'كلما أخذت مني أكثر، تركت خلفك أكثر. ما أنا؟' },
    answer: { en: 'Footsteps', ar: 'خطوات القدم' },
  },
  {
    id: 'r2',
    prompt: { en: 'I have keys but no locks, space but no room. You can enter, but not go outside. What am I?', ar: 'لديّ مفاتيح لكن لا أقفال، ومساحة لكن لا غرف. يمكنك الدخول إليّ لكن لا يمكنك الخروج. ما أنا؟' },
    answer: { en: 'A keyboard', ar: 'لوحة المفاتيح' },
  },
  {
    id: 'r3',
    prompt: { en: 'What has to be broken before you can use it?', ar: 'ما الذي يجب أن يُكسر قبل أن تستطيع استخدامه؟' },
    answer: { en: 'An egg', ar: 'البيضة' },
  },
  {
    id: 'r4',
    prompt: { en: 'I’m tall when I’m young and short when I’m old. What am I?', ar: 'أكون طويلاً في شبابي وقصيراً في شيخوختي. ما أنا؟' },
    answer: { en: 'A candle', ar: 'الشمعة' },
  },
  {
    id: 'r5',
    prompt: { en: 'What gets bigger the more you take away from it?', ar: 'ما الذي يكبر كلما أخذت منه أكثر؟' },
    answer: { en: 'A hole', ar: 'الحفرة' },
  },
  {
    id: 'r6',
    prompt: { en: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?', ar: 'أتكلم بلا فم وأسمع بلا أذنين. ليس لي جسد، لكنني أحيا مع الريح. ما أنا؟' },
    answer: { en: 'An echo', ar: 'الصدى' },
  },
  {
    id: 'r7',
    prompt: { en: 'What can travel around the world while staying in a corner?', ar: 'ما الذي يمكنه أن يجول العالم بينما يبقى في زاويته؟' },
    answer: { en: 'A stamp', ar: 'الطابع البريدي' },
  },
  {
    id: 'r8',
    prompt: { en: 'You’ll always find me in the past. I can be created in the present, but the future can never taint me. What am I?', ar: 'ستجدني دائماً في الماضي. يمكن صنعي في الحاضر، لكن المستقبل لا يمكنه أن يلوّثني أبداً. ما أنا؟' },
    answer: { en: 'History', ar: 'التاريخ' },
  },
  {
    id: 'r9',
    prompt: { en: 'What has many teeth but cannot bite?', ar: 'ما الذي له أسنان كثيرة لكنه لا يستطيع أن يعضّ؟' },
    answer: { en: 'A comb', ar: 'المشط' },
  },
  {
    id: 'r10',
    prompt: { en: 'I’m not alive, but I grow. I don’t have lungs, but I need air. I don’t have a mouth, but water kills me. What am I?', ar: 'لست حياً، لكنني أنمو. ليس لي رئتان، لكنني أحتاج الهواء. ليس لي فم، لكن الماء يقتلني. ما أنا؟' },
    answer: { en: 'Fire', ar: 'النار' },
  },
  {
    id: 'r11',
    prompt: { en: 'What question can you never answer yes to?', ar: 'ما السؤال الذي لا يمكنك أبداً أن تجيب عليه بـ«نعم»؟' },
    answer: { en: '“Are you asleep yet?”', ar: '«هل أنت نائم الآن؟»' },
  },
  {
    id: 'r12',
    prompt: { en: 'The person who makes it, sells it. The person who buys it never uses it. The person who uses it never knows it. What is it?', ar: 'من يصنعها يبيعها. من يشتريها لا يستخدمها أبداً. من يستخدمها لا يعرف بها أبداً. ما هي؟' },
    answer: { en: 'A coffin', ar: 'التابوت' },
  },
]

export const breakCopy = {
  trigger: { en: '🎲 Play a riddle or game', ar: '🎲 العب لغزاً أو لعبة' } as Bi,
  back: { en: 'Back to progress', ar: 'عودة إلى التقدّم' } as Bi,
  another: { en: 'Something else', ar: 'شيء آخر' } as Bi, // reroll to a different activity
  reveal: { en: 'Reveal answer', ar: 'اكشف الإجابة' } as Bi,
  nextRiddle: { en: 'Another one', ar: 'واحد آخر' } as Bi,
  playAgain: { en: 'Play again', ar: 'العب مرة أخرى' } as Bi,
  yourTurn: { en: 'Your turn', ar: 'دورك' } as Bi,
  botTurn: { en: 'Bot thinking…', ar: 'يفكر الروبوت…' } as Bi,
  youWin: { en: 'You win! 🎉', ar: 'لقد فزت! 🎉' } as Bi,
  youLose: { en: 'Bot wins', ar: 'فاز الروبوت' } as Bi,
  draw: { en: 'Draw', ar: 'تعادل' } as Bi,
  pickHand: { en: 'Rock, paper, or scissors?', ar: 'حجر، ورقة، أم مقص؟' } as Bi,
  allMatched: { en: 'All matched! 🎉', ar: 'تم العثور على كل الأزواج! 🎉' } as Bi,
}

export const RPS_CHOICES: { key: 'rock' | 'paper' | 'scissors'; emoji: string; label: Bi }[] = [
  { key: 'rock', emoji: '✊', label: { en: 'Rock', ar: 'حجر' } },
  { key: 'paper', emoji: '✋', label: { en: 'Paper', ar: 'ورقة' } },
  { key: 'scissors', emoji: '✌️', label: { en: 'Scissors', ar: 'مقص' } },
]

export const MEMORY_SYMBOLS = ['🎯', '🎨', '🎵', '🎲']
