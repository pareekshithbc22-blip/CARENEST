import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/config";
import { Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Care Circle Invitation - CareNest",
  description: "Accept invitation to join an authorized family care circle.",
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();

  const invitation = await prisma.careCircleInvitation.findUnique({
    where: { token },
    include: {
      careCircle: {
        include: { elderlyProfile: true },
      },
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!invitation) {
    notFound();
  }

  const isExpired = new Date() > invitation.expiresAt;
  const isPending = invitation.status === "PENDING" && !isExpired;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center space-x-2 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-md shadow-teal-700/20">
            <Heart className="h-6 w-6 stroke-2" />
          </div>
          <span className="text-2xl font-black text-slate-900">
            CARE<span className="text-teal-700">NEST</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
          Care Circle Invitation
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          You have been invited to collaborate in healthcare coordination.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl space-y-6">
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Invited By:</span>
              <span className="text-xs font-bold text-slate-900">{invitation.invitedBy.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Care Circle:</span>
              <span className="text-xs font-bold text-slate-900">{invitation.careCircle.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">Elderly Loved One:</span>
              <span className="text-xs font-bold text-teal-800">{invitation.careCircle.elderlyProfile.name}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">Designated Role:</span>
              <Badge variant="default" className="text-xs">{invitation.role}</Badge>
            </div>
          </div>

          {!isPending ? (
            <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-900 text-xs font-semibold text-center">
              {isExpired ? "This invitation link has expired." : `This invitation is ${invitation.status.toLowerCase()}.`}
            </div>
          ) : user ? (
            <form
              action={async () => {
                "use server";
                const res = await fetch(
                  `${getAppUrl()}/api/care-circles/invitations/${token}/accept`,
                  { method: "POST" }
                );
                if (res.ok) {
                  redirect("/dashboard/family");
                }
              }}
            >
              <Button
                type="submit"
                className="w-full h-12 bg-teal-700 hover:bg-teal-800 text-white font-bold text-base shadow-md"
              >
                Accept & Join Care Circle <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <div className="space-y-3 text-center">
              <p className="text-xs text-slate-600">
                Please sign in or register an account to accept this invitation.
              </p>
              <Link href={`/login?callbackUrl=/invite/${token}`}>
                <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm">
                  Sign In to Accept
                </Button>
              </Link>
              <Link href={`/register`}>
                <Button variant="outline" className="w-full text-xs font-semibold">
                  Create New Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
