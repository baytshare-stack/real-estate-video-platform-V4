"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";

export default function UploadPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: any) => {
    if (e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: any) => {
    e.preventDefault();

    if (!videoFile) {
      alert("Please choose a video");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", videoFile);
    formData.append("upload_preset", "real-estate");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dcppbps4n/video/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    console.log("Uploaded video:", data.secure_url);

    alert("Video uploaded successfully!");

    setUploading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-10 text-white">

      <h1 className="text-3xl font-bold mb-6">Upload Property Video</h1>

      <form onSubmit={handleUpload} className="space-y-6">

        <label className="block border-2 border-dashed border-gray-600 p-10 text-center rounded-xl cursor-pointer hover:border-blue-500">

          <UploadCloud className="mx-auto mb-4" size={40} />

          <p>Click to choose video</p>

          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
          />

        </label>

        {videoFile && (
          <p className="text-green-400">
            Selected: {videoFile.name}
          </p>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="bg-blue-600 px-6 py-3 rounded-lg"
        >
          {uploading ? "Uploading..." : "Upload Video"}
        </button>

      </form>

    </div>
  );
}