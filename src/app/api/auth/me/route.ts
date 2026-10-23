import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { GROUP_CODES } from "@/lib/columns";
import { getGroupPermissionSummary } from "@/lib/permissions";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json(
      { error: "Oturum süreniz dolmuş veya giriş yapılmamış. Lütfen tekrar giriş yapın." },
      { status: 401 }
    );
  }

  const groupPermissions = Object.fromEntries(
    GROUP_CODES.map((g) => [g, getGroupPermissionSummary(session.roleCode, g)])
  );

  return NextResponse.json({
    user: session,
    groupPermissions,
  });
}
