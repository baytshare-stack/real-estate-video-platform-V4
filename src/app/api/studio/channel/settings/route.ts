import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import path from 'path';
import fs from 'fs/promises';
import prisma from '@/lib/prisma';
import { safeFindUnique } from '@/lib/safePrisma';

function parseOptionalString(value: FormDataEntryValue | null): string | null {
  if (!value) return null;
  const s = typeof value === 'string' ? value : '';
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function validateHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function validatePhone(value: string | null): string | null {
  if (!value) return null;
  // Require full international format: +<countryCode><number>
  // Keep it simple but strict to prevent invalid data reaching UI later.
  const trimmed = value.trim();
  if (!/^\+\d{7,15}$/.test(trimmed)) return null;
  return trimmed;
}

function guessExtension(fileName: string, mimeType: string | null): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.gif')) return 'gif';
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) return 'jpg';
  if (mimeType?.includes('webp')) return 'webp';
  return 'png';
}

async function saveUploadToPublic(file: File, folder: string, prefix: string): Promise<string> {
  const channelPublicDir = path.join(process.cwd(), 'public', folder);
  await fs.mkdir(channelPublicDir, { recursive: true });

  const ext = guessExtension(file.name || 'upload', file.type || null);
  const safeBase = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fileName = `${safeBase}.${ext}`;
  const absPath = path.join(channelPublicDir, fileName);

  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(absPath, bytes);

  // Public URL that Next can serve.
  return `/${path.posix.join(folder.replace(/\\/g, '/'), fileName)}`;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();

  const name = parseOptionalString(formData.get('name')) ?? '';
  const description = parseOptionalString(formData.get('description'));

  const country = parseOptionalString(formData.get('country'));
  const phoneRaw = parseOptionalString(formData.get('phone'));
  const whatsappRaw = parseOptionalString(formData.get('whatsapp'));

  const facebookUrl = validateHttpUrl(parseOptionalString(formData.get('facebookUrl')));
  const instagramUrl = validateHttpUrl(parseOptionalString(formData.get('instagramUrl')));
  const whatsappUrl = validateHttpUrl(parseOptionalString(formData.get('whatsappUrl')));
  const telegramUrl = validateHttpUrl(parseOptionalString(formData.get('telegramUrl')));
  const youtubeUrl = validateHttpUrl(parseOptionalString(formData.get('youtubeUrl')));
  const websiteUrl = validateHttpUrl(parseOptionalString(formData.get('websiteUrl')));

  if (!name.trim()) {
    return NextResponse.json({ error: 'Channel name is required' }, { status: 400 });
  }
  if (!country) {
    return NextResponse.json({ error: 'Country is required' }, { status: 400 });
  }

  const phone = validatePhone(phoneRaw);
  if (!phone) {
    return NextResponse.json({ error: 'Invalid phone number. Expected format: +<countryCode><number>' }, { status: 400 });
  }

  const whatsapp = validatePhone(whatsappRaw);
  if (!whatsapp) {
    return NextResponse.json({ error: 'Invalid WhatsApp number.' }, { status: 400 });
  }

  const profileImageFile = formData.get('profileImage');
  const bannerImageFile = formData.get('bannerImage');

  const profileFile =
    profileImageFile && typeof profileImageFile !== 'string' && profileImageFile.size > 0
      ? (profileImageFile as File)
      : null;
  const bannerFile =
    bannerImageFile && typeof bannerImageFile !== 'string' && bannerImageFile.size > 0
      ? (bannerImageFile as File)
      : null;

  // Find channel by ownerId (studio auth user).
  const channel = await safeFindUnique(() =>
    prisma.channel.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    })
  );

  if (!channel) {
    return NextResponse.json({ error: 'No channel found' }, { status: 404 });
  }

  let profileImageUrl: string | null = null;
  let bannerImageUrl: string | null = null;

  if (profileFile) {
    profileImageUrl = await saveUploadToPublic(
      profileFile,
      path.posix.join('uploads', 'channels', channel.id),
      'profile'
    );
  }

  if (bannerFile) {
    bannerImageUrl = await saveUploadToPublic(
      bannerFile,
      path.posix.join('uploads', 'channels', channel.id),
      'banner'
    );
  }

  const updatedChannel = await prisma.channel.update({
    where: { ownerId: userId },
    data: {
      name,
      description,
      country,
      phone,
      whatsapp,
      facebookUrl,
      instagramUrl,
      whatsappUrl,
      telegramUrl,
      youtubeUrl,
      websiteUrl,
      profileImage: profileImageUrl ?? undefined,
      bannerImage: bannerImageUrl ?? undefined,
      // Backward compatibility for existing UI.
      avatar: profileImageUrl ?? undefined,
    },
    select: {
      id: true,
      name: true,
      description: true,
      avatar: true,
      profileImage: true,
      bannerImage: true,
      country: true,
      phone: true,
      whatsapp: true,
      whatsappUrl: true,
      facebookUrl: true,
      instagramUrl: true,
      telegramUrl: true,
      youtubeUrl: true,
      websiteUrl: true,
    },
  });

  return NextResponse.json({ channel: updatedChannel }, { status: 200 });
}

