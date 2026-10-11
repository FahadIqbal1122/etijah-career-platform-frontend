export default function Footer() {
  return (
    <footer className="bg-white border-t border-[var(--line)] py-6 px-6 text-center text-sm text-charcoal/45">
      <div className="flex justify-center gap-4 mb-2">
        <a href="https://shop.etijahcoaching.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-teal underline">Terms &amp; Conditions</a>
        <a href="https://shop.etijahcoaching.com/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-teal underline">Privacy Policy</a>
      </div>
      © {new Date().getFullYear()} Etijahi · إتجاهي. All rights reserved.
    </footer>
  )
}
