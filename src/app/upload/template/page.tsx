import Link from "next/link";
import TemplateListingWizard from "@/components/upload/TemplateListingWizard";

export default function UploadTemplatePage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/upload"
            className="text-sm font-medium text-indigo-600 underline underline-offset-2 dark:text-indigo-400"
          >
            ← Back to video upload
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Premium template listing
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Select a motion template, add your property photos and optional audio, then publish. Viewers see a
            cinematic slideshow — no video file required.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <TemplateListingWizard />
        </div>
      </div>
    </div>
  );
}
