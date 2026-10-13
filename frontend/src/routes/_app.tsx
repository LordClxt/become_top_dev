import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppHeader, MobileTabBar } from '@/components/AppHeader'
import { XpToaster } from '@/components/XpToaster'
import { meQuery } from '@/features/auth/queries'
import { progressQuery } from '@/features/courses/queries'

/** Espace connecté : la session est vérifiée avant le rendu (y compris côté serveur), sans écran vide. */
export const Route = createFileRoute('/_app')({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery)
    if (!me.authenticated) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
  },
  // Niveau et série s'affichent dans l'en-tête dès le rendu serveur ; sans réponse, l'en-tête s'en passe.
  loader: ({ context }) => context.queryClient.ensureQueryData(progressQuery).catch(() => null),
  component: AppLayout,
})

function AppLayout() {
  return (
    <>
      <AppHeader />
      <Outlet />
      {/* Réserve la hauteur de la barre d'onglets mobile pour que la fin des pages reste visible. */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <MobileTabBar />
      <XpToaster />
    </>
  )
}
