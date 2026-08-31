import { redirect } from 'next/navigation'

/** Users land on login only. Admin desk is not linked here. */
export default function Home() {
  redirect('/sign-in')
}
