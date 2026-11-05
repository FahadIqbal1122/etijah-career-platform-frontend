// Which pay-screen message to show. People who gave an age of ADULT_MIN_AGE or
// more see the adult version (finding the right next role); everyone else, or
// anyone whose age is unknown, keeps the original student version.
export const ADULT_MIN_AGE = 22

export type GateVariant = 'adult' | 'student'

export function gateVariantFor(answers: Record<string, unknown>): GateVariant {
  const age = Number(answers.QO3)
  return Number.isFinite(age) && age >= ADULT_MIN_AGE ? 'adult' : 'student'
}
