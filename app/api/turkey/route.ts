import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = "https://api.turkiyeapi.dev/v2";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const type = searchParams.get("type");
  const provinceId = searchParams.get("provinceId");
  const districtId = searchParams.get("districtId");

  try {
    let url = "";

    if (type === "provinces") {
      url = `${API_BASE_URL}/provinces`;
    } else if (type === "districts" && provinceId) {
      url = `${API_BASE_URL}/districts?provinceId=${provinceId}`;
    } else if (type === "neighborhoods" && districtId) {
      url = `${API_BASE_URL}/neighborhoods?districtId=${districtId}`;
    } else {
      return NextResponse.json(
        { error: "Paramètres invalides." },
        { status: 400 },
      );
    }

    const response = await fetch(url, {
      next: {
        revalidate: 86400,
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur API : ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur de récupération des adresses :", error);

    return NextResponse.json(
      { error: "Impossible de charger les données d’adresse." },
      { status: 500 },
    );
  }
}