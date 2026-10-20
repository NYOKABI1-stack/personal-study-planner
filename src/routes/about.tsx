import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [
    { title: "About — AZ-900 Study Planner" },
    { name: "description", content: "How this unofficial Azure Fundamentals planner schedules learning, practice, review and mock exams." },
    { property: "og:title", content: "About the AZ-900 Study Planner" },
    { property: "og:description", content: "A community study planner for learners preparing for Azure Fundamentals." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: About,
});

function About() {
  return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <p className="font-mono text-xs uppercase text-muted-foreground">Azure Fundamentals · community tool</p>
    <h1 tabIndex={-1} className="mt-2 font-display text-4xl font-extrabold">About the AZ-900 Study Planner<span className="text-review">.</span></h1>
    <p className="mt-5 max-w-2xl text-lg">For first-time cloud learners, career changers, and anyone preparing for the Microsoft Azure Fundamentals exam.</p>
    <p className="mt-3 leading-relaxed">The planner turns your available hours, exam date and topic confidence into a day-by-day schedule. You can study without an account, or sign in to keep a personal plan and your completed sessions.</p>
    <section className="mt-10 border-t border-foreground pt-6" aria-labelledby="schedule-heading">
      <h2 id="schedule-heading" className="font-display text-2xl font-semibold">How your schedule takes shape</h2>
      <ol className="mt-4 list-decimal space-y-4 pl-5 leading-relaxed">
        <li><strong>Start with the weakest topics.</strong> Lower confidence means more time; topic weights also affect the allocation.</li>
        <li><strong>Learn, then practise, then review.</strong> Longer plans spend more time learning. When the exam is close, the balance shifts towards practice and final review.</li>
        <li><strong>Come back to topics.</strong> Practice and review rotate through topics, spreading repeat visits across the available sessions rather than keeping everything together.</li>
        <li><strong>Rehearse the exam.</strong> Up to three timed mock exams are placed in the second half of the plan, depending on your available study days.</li>
        <li><strong>Ease off the day before.</strong> Available study time is halved into a light recap. Exam day has no scheduled study.</li>
      </ol>
    </section>
    <section className="mt-10 border-t border-foreground pt-6" aria-labelledby="skills-heading">
      <h2 id="skills-heading" className="font-display text-2xl font-semibold">The three AZ-900 skill areas</h2>
      <ul className="mt-4 space-y-3">
        <li><strong>Cloud concepts</strong> — cloud models, shared responsibility, cloud benefits, IaaS, PaaS and SaaS.</li>
        <li><strong>Azure architecture and services</strong> — infrastructure, compute, networking, storage, identity and security.</li>
        <li><strong>Azure management and governance</strong> — costs, policies, resource management and monitoring.</li>
      </ul>
      <p className="mt-4">Skills and exam percentages can change. Always check the <a href="https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900" target="_blank" rel="noreferrer" className="font-bold text-primary underline">official Microsoft Learn AZ-900 study guide</a>.</p>
    </section>
    <p className="mt-10 border-t border-foreground pt-4 text-sm text-muted-foreground">Unofficial community tool — not affiliated with or endorsed by Microsoft. A schedule is a study aid, not a guarantee of passing.</p>
  </main>;
}