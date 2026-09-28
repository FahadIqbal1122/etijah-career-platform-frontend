// design-sync stub for '@/lib/supabase'. The real module reads
// `process.env.NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_KEY` and calls
// `createClient(...)` eagerly at module scope — that throws when bundled for
// a static browser preview. Not currently imported by any synced component,
// kept here so a future component that imports it directly still bundles.
// See .design-sync/NOTES.md.

export const supabase = {
    auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
        }),
    },
}
