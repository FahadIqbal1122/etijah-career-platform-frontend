// Small pictures for answer options, so the assessment is quicker to scan than a wall of text.
// - FLAG_FILES: real flag images (public/flags, MIT-licensed "flag-icons"). Image files, not flag emoji, because Windows
//   shows flag emoji as two letters ("SA") instead of a flag.
// - OPTION_EMOJI: one emoji per option for the rest. Same stored values as before; only the look changes.
// Options not listed here simply show no icon.

export const FLAG_FILES: Record<string, Record<string, string>> = {
  QO1: { saudi_arabia: 'sa', bahrain: 'bh', uae: 'ae', kuwait: 'kw', qatar: 'qa', oman: 'om' },
  QO2: { saudi: 'sa', bahraini: 'bh', emirati: 'ae', kuwaiti: 'kw', qatari: 'qa', omani: 'om' },
  // where they want to work
  QOTC: { saudi_arabia: 'sa', bahrain: 'bh', uae: 'ae', kuwait: 'kw', qatar: 'qa', oman: 'om' },
}

export const OPTION_EMOJI: Record<string, Record<string, string>> = {
  // the "other" options of the two flag questions
  QO1: { other_gcc: '🌍', other_middle_east: '🌍', other: '🌐' },
  QO2: { other: '🌐' },
  QOTC: { same_as_current: '📍', anywhere_gcc: '🌍', other: '🌐' },
  QO4: {
    high_school: '🎒', university: '🎓', recent_graduate: '📜', working_exploring: '💼',
    career_changer: '🔄', returning: '↩️', between_roles: '⏳', other: '✏️',
  },
  QOYR: { year_1: '1️⃣', year_2: '2️⃣', year_3: '3️⃣', year_4: '4️⃣', final_year: '🏁', other: '✏️' },
  QO3B: {
    no_experience: '🌱', internships_only: '📋', up_to_1yr: '🌿', up_to_3yrs: '🪴', up_to_5yrs: '🌳', up_to_10yrs: '🌲', '10yrs_plus': '🏔️',
  },
  QO5: {
    business: '💼', engineering: '⚙️', computer_science: '💻', medicine: '🩺', sciences: '🔬', humanities: '📚',
    arts: '🎨', education: '🏫', law: '⚖️', other: '✏️', not_applicable: '🚫',
  },
  QO5C: { stay_in_field: '🎯', unsure_subject: '🤔', change_field: '🔄', other: '✏️', not_sure: '❓' },
  QO9: { yes_anywhere: '🌍', yes_gcc: '🏜️', maybe: '🤔', no: '🏠' },
  QO10: { choosing_study: '🎓', first_job: '🚀', career_change: '🔄', curious: '👀', recommended: '💬', other: '✏️' },
}

export function optionEmoji(qid: string, value: string): string | undefined {
  return OPTION_EMOJI[qid]?.[value]
}
