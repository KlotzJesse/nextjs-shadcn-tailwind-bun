import { redirect } from "next/navigation";

export const experimental_ppr = true;

export default async function PostalCodesDefaultPage() {
  redirect("/postal-codes/1digit");
}
