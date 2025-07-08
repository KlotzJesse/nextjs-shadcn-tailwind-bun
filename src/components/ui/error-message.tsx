import { AlertError } from "./alert";

export function ErrorMessage({ message }: { message?: string }) {
  return <AlertError message={message} />;
}
