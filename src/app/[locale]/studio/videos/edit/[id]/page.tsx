import UploadVideoPageContent from "@/components/upload/UploadVideoPageContent";

export default async function StudioEditVideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <UploadVideoPageContent editVideoId={id} />;
}
