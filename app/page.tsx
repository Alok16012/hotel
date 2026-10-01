import { redirect } from "next/navigation";

/**
 * There is no marketing surface in this product. The root is the Command
 * Center; a real auth layer would later decide this redirect target by role
 * (reception lands on arrivals, sales lands on the lead inbox).
 */
export default function Home() {
  redirect("/dashboard");
}
