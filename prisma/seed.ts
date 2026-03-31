import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const templates = [
    {
      name: "Cinematic Short 1",
      type: "short",
      previewImage: "https://placekitten.com/400/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Short 2",
      type: "short",
      previewImage: "https://placekitten.com/401/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Short 3",
      type: "short",
      previewImage: "https://placekitten.com/402/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Short 4",
      type: "short",
      previewImage: "https://placekitten.com/403/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Short 5",
      type: "short",
      previewImage: "https://placekitten.com/404/300",
      previewVideo: "https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    // Long templates
    {
      name: "Cinematic Long 1",
      type: "long",
      previewImage: "https://placekitten.com/405/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Long 2",
      type: "long",
      previewImage: "https://placekitten.com/406/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Long 3",
      type: "long",
      previewImage: "https://placekitten.com/407/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Long 4",
      type: "long",
      previewImage: "https://placekitten.com/408/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
    {
      name: "Cinematic Long 5",
      type: "long",
      previewImage: "https://placekitten.com/409/300",
      previewVideo: "https://sample-videos.com/video123/mp4/480/big_buck_bunny_480p.mp4",
      config: {},
      defaultAudio: "https://sample-videos.com/audio/mp3/wave.mp3",
    },
  ];

  for (const t of templates) {
    await prisma.template.create({ data: t });
  }

  console.log("✅ Templates seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });