import { getResume } from "@/actions/resume";
import ResumeBuilder from "./_components/resume-builder";

export const dynamic = "force-dynamic"; // <-- key fix

export default async function ResumePage() {
  const resume = await getResume();

  return (
    <div className="container mx-auto py-6">
      <ResumeBuilder initialContent={resume?.content || ""} />
    </div>
  );
}
