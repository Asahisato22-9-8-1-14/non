import type { Metadata } from "next";
import { StudySystem } from "@/components/system/study-system";

export const metadata: Metadata = {
  title: "Justin Sung Study System — Study Like a Learning Scientist",
  description:
    "An interactive, end-to-end study system based on Dr. Justin Sung's methods: 8 phases, 49 connected steps, and hands-on widgets.",
};

export default function Page() {
  return <StudySystem />;
}
