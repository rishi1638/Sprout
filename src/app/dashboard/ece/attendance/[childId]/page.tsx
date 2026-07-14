import { ArrowLeft, QrCode } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { QRCodeSVG } from "qrcode.react";

export const dynamic = "force-dynamic";

export default async function AttendanceQrPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;
  await requireRole("ece");
  const supabase = await createClient();

  const { data: child } = await supabase.from("children").select("id, first_name, last_name").eq("id", childId).single();

  return (
    <>
      <PageHeader title="QR check-in" description="Share this page for quick check-in and check-out." />
      <Button variant="ghost" asChild>
        <Link href="/dashboard/ece/attendance">
          <ArrowLeft className="mr-2 size-4" /> Back to attendance
        </Link>
      </Button>
      <Card className="mx-auto mt-4 max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-4" /> {child ? `${child.first_name} ${child.last_name}` : "Child"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-white p-4">
            <QRCodeSVG value={`${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/dashboard/ece/attendance/scan/${childId}`} size={220} />
          </div>
          <p className="text-sm text-muted-foreground">
            Parents or staff can scan this code to open a quick check-in or check-out flow for this child.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
