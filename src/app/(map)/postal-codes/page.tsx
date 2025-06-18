import { redirect } from 'next/navigation'

export default function PostalCodesDefaultPage() {
  redirect('/postal-codes/plz-5stellig')
} 