import { redirect } from "next/navigation";

/** No landing page in the open-source build — go straight to the app. */
export default function Home() {
  redirect("/ads-manager");
}
