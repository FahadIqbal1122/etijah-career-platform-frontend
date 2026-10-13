// Assessment chapters. The questions keep their original order and scoring; a chapter is just a run of
// consecutive questions (grouped by their `section`). One star per chapter, and a green "chapter complete"
// screen at the end of each.

export type ChapterCopy = { en: string; ar: string }

export type Chapter = {
  key: string
  title: ChapterCopy
  short: ChapterCopy // one or two words, written next to the chapter's star on the progress map
  sections: string[] // questions.ts `section` values that belong to this chapter
  // Framework whose leaning personalises the end-of-chapter screen (see revealScoring.ts); null = fixed copy.
  revealFramework: 'riasec' | 'values' | 'strengths' | null
  // Fixed copy for chapters without a framework reveal.
  done?: { en: { head: string; body: string }; ar: { head: string; body: string } }
}

export const CHAPTERS: Chapter[] = [
  {
    key: 'about',
    title: { en: 'About You', ar: 'عنك' },
    short: { en: 'About you', ar: 'عنك' },
    sections: ['Your Details', 'Onboarding'],
    revealFramework: null,
    done: {
      en: { head: 'That’s your starting point.', body: 'We know where you’re coming from. Next, let’s look at what draws you and who you are.' },
      ar: { head: 'هذه نقطة انطلاقك.', body: 'عرفنا من أين تبدأ. والآن لنكتشف ما يجذبك ومن أنت.' },
    },
  },
  {
    key: 'personality',
    title: { en: 'Interests & Personality', ar: 'الميول والشخصية' },
    short: { en: 'Interests', ar: 'الميول' },
    sections: ['Holland RIASEC', 'Big Five'],
    revealFramework: 'riasec',
  },
  {
    key: 'values',
    title: { en: 'Values', ar: 'القيم' },
    short: { en: 'Values', ar: 'القيم' },
    sections: ['Values'],
    revealFramework: 'values',
  },
  {
    key: 'strengths',
    title: { en: 'Strengths', ar: 'نقاط القوة' },
    short: { en: 'Strengths', ar: 'نقاط القوة' },
    sections: ['Strengths'],
    revealFramework: 'strengths',
  },
  {
    key: 'workstyle',
    title: { en: 'Work Style & Drive', ar: 'أسلوب العمل والدافع' },
    short: { en: 'Work style', ar: 'أسلوب العمل' },
    sections: ['Resilience', 'Work Style', 'Entrepreneurship'],
    revealFramework: null,
  },
]

export const CHAPTER_COUNT = CHAPTERS.length

// The optional "field you have in mind" question sits at the very end with section 'Onboarding'; by position it
// belongs to the last chapter, not the first.
const ID_OVERRIDES: Record<string, number> = { QOFIELD: CHAPTERS.length - 1 }

// 0-based chapter index for a question.
export function chapterIndexOf(id: string, section: string): number {
  if (id in ID_OVERRIDES) return ID_OVERRIDES[id]
  const i = CHAPTERS.findIndex(c => c.sections.includes(section))
  return i === -1 ? 0 : i
}
