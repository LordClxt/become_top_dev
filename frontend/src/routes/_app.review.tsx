import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/review')({
  head: () => ({ meta: [{ title: 'Révision du jour · become_top_dev' }] }),
  component: ReviewPage,
})

function ReviewPage() {
  return <main className="mx-auto max-w-[760px] px-6 pt-14 pb-24" />
}
