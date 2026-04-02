import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Link from 'next/link';
import { BookMarked, LogIn, Users } from 'lucide-react';
import { type Locale, locales } from '@/i18n/config';
import { prefixWithLocale } from '@/i18n/routing';
import PageHeader from '@/components/PageHeader';
import prisma from '@/lib/prisma';
import { safeFindMany } from '@/lib/safePrisma';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: loc } = await params;
  const locale = (locales.includes(loc as Locale) ? loc : "en") as Locale;
  const lp = (path: string) => prefixWithLocale(locale, path);
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center p-6">
        <div className="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center">
          <BookMarked className="w-10 h-10 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Sign in to view subscriptions</h1>
          <p className="text-gray-400 text-sm max-w-sm">
            All the channels you subscribe to will appear here.
          </p>
        </div>
        <Link
          href={lp("/login")}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-full transition-colors"
        >
          <LogIn className="w-5 h-5" /> Sign In
        </Link>
      </div>
    );
  }

  const channels = await safeFindMany(() =>
    prisma.channel.findMany({
      include: {
        _count: { select: { videos: true } },
      },
      orderBy: { name: 'asc' },
    })
  );

  return (
    <div className="p-4 md:p-6 max-w-[2000px] mx-auto min-h-screen">
      <PageHeader
        iconName="BookMarked"
        iconColor="text-purple-500"
        title="Subscriptions"
        subtitle={`Discover ${channels.length} channel${channels.length !== 1 ? 's' : ''} on the platform`}
      />

      {/* Info banner */}
      <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm">
        <BookMarked className="w-4 h-4 flex-shrink-0" />
        Visit a channel page and tap <strong className="mx-1">Subscribe</strong> to personalize this list. Showing all channels for now.
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg font-medium">No channels yet</p>
          <p className="text-gray-600 text-sm mt-1">Be the first to create one!</p>
          <Link
            href={lp("/create-channel")}
            className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-full text-sm transition-colors"
          >
            Create a Channel
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={lp(`/channel/${ch.id}`)}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-800 border border-gray-700 flex-shrink-0">
                <img
                  src={
                    ch.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(ch.name)}&background=random`
                  }
                  alt={ch.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="overflow-hidden">
                <p className="text-white font-semibold text-sm truncate group-hover:text-blue-400 transition-colors">
                  {ch.name}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {ch._count?.videos ?? 0} video{(ch._count?.videos ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
