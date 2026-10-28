import { NextResponse } from "next/server";
import { getDatabaseVersion } from "@/lib/db/health";

export async function GET() {
  try {
    const version = await getDatabaseVersion();

    return NextResponse.json({
      success: true,
      message: "Connexion à Neon réussie",
      version,
    });
  } catch (error) {
    console.error("Erreur de connexion à Neon :", error);

    return NextResponse.json(
      {
        success: false,
        message: "Échec de la connexion à Neon",
      },
      { status: 500 },
    );
  }
}
