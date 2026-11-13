import { NotFoundPanel } from "@/components/states/panels";
import { readUiLanguage } from "@/components/layout/paper-frame";

export default async function NotFound() {
  const language = await readUiLanguage();
  return <NotFoundPanel language={language} />;
}
