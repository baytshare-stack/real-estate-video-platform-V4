import UploadVideoPageContent from "@/components/upload/UploadVideoPageContent";

export default async function UploadVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const sp = await searchParams;
  return <UploadVideoPageContent editVideoId={sp.edit} />;
}