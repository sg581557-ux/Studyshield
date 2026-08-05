import { PublicNavbar, PublicFooter } from "../components/public/PublicChrome";

const SECTIONS = [
  {
    title: "1. Information we collect",
    body: "We collect information you provide directly, such as your name, email address, target exam, study preferences and backlog details. We also collect anonymous usage data (pages visited, features used) to improve the product.",
  },
  {
    title: "2. How we use your information",
    body: "Your data is used to generate your daily study plan, track progress, provide the AI mentor, and improve StudyShield. We never sell your personal information to third parties.",
  },
  {
    title: "3. Data storage & security",
    body: "Your data is stored securely on industry-standard cloud infrastructure with encryption in transit and at rest. Access is restricted to systems that require it to operate the service.",
  },
  {
    title: "4. Sharing & disclosure",
    body: "We do not share your personal data with third parties except: (a) with your explicit consent, (b) to comply with legal obligations, or (c) to trusted service providers who help us operate the service under strict confidentiality agreements.",
  },
  {
    title: "5. Your rights",
    body: "You may request access to, correction of, or deletion of your personal data at any time by contacting us. You can also export or permanently delete your study data from the app settings.",
  },
  {
    title: "6. Cookies & local storage",
    body: "We use local storage and similar technologies to keep you signed in and remember your preferences. You can clear this data through your browser settings at any time.",
  },
  {
    title: "7. Children's privacy",
    body: "StudyShield is intended for students of all ages preparing for exams. We do not knowingly collect more information than is necessary to operate the service, and we encourage parents to supervise younger students' usage.",
  },
  {
    title: "8. Changes to this policy",
    body: "We may update this policy from time to time. Material changes will be communicated through the app or by email. Continued use of StudyShield after changes means you accept the updated policy.",
  },
  {
    title: "9. Contact us",
    body: "For privacy questions or requests, email support@studyshield.study. We'll respond within 7 days.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="public-site min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <PublicNavbar />
      <main className="pt-40 pb-32 px-6 max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-gray-500">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-7">
              <h2 className="text-lg font-semibold mb-2">{s.title}</h2>
              <p className="text-gray-400 leading-relaxed text-sm">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
