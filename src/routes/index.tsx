import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Logos } from "@/components/landing/Logos";
import { Roles } from "@/components/landing/Roles";
import { Features } from "@/components/landing/Features";
import { Workflow } from "@/components/landing/Workflow";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Noti — Notes, goals and progress for every classroom" },
      { name: "description", content: "Noti keeps students, teachers and parents in sync with lesson notes, homework, goals and real-time progress." },
      { property: "og:title", content: "Noti — Notes, goals and progress for every classroom" },
      { property: "og:description", content: "Role-based notes, homework and goals for students, teachers and parents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <Logos />
        <Roles />
        <Features />
        <Workflow />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
