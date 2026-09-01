import {
  NextResponse,
} from "next/server";

import {
  requireApiPartner,
} from "@/lib/auth/requireApiPartner";

export async function GET() {
  const auth =
    await requireApiPartner();

  if (!auth.success) {
    return auth.response;
  }

  return NextResponse.json(
    {
      success: true,

      partner: {
        id:
          auth.partner.id,

        code:
          auth.partner.code,

        companyName:
          auth.partner.companyName,

        managerName:
          auth.partner.managerName,

        email:
          auth.partner.email,

        isActive:
          auth.partner.isActive,
      },
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}