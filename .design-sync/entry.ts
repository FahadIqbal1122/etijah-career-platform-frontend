// Hand-written barrel entry for design-sync. This app is a Next.js app, not
// a published component library, so there is no dist/ or exported .d.ts to
// point the converter at. This file re-exports the components we're syncing
// as named bindings so the converter can discover and bundle them.
//
// Router-context-dependent components (Header, LanguageSwitcher, BlurGate,
// LockedSection) are included so they're bundled and importable, but they
// depend on next-intl's `@/i18n/navigation` (createNavigation -> next/navigation
// hooks), which requires a live Next.js App Router context that a static
// preview render can't provide. They ship as floor cards for now — see
// .design-sync/NOTES.md.

export { default as Logomark, Wordmark } from '../src/components/brand/Logomark';
export { default as Constellation } from '../src/components/brand/Constellation';
export { default as LandingConstellation } from '../src/components/brand/LandingConstellation';
export { default as Footer } from '../src/components/Footer';
export { CopyLinkButton } from '../src/components/CopyLinkButton';
export { default as BreakPanel } from '../src/components/BreakPanel';
export { default as FieldOfStudyInfo } from '../src/components/FieldOfStudyInfo';
export { default as BugReportModal } from '../src/components/BugReportModal';
export { default as RichTextEditor } from '../src/components/RichTextEditor';
export { default as PartnerModal } from '../src/components/shared/PartnerModal';
export { default as CountdownTimer } from '../src/components/waitlist/CountdownTimer';
export { default as SearchableSelect } from '../src/components/waitlist/SearchableSelect';
export { default as MemoryMatch } from '../src/components/MemoryMatch';
export { default as RockPaperScissors } from '../src/components/RockPaperScissors';
export { default as TicTacToeGame } from '../src/components/TicTacToeGame';
