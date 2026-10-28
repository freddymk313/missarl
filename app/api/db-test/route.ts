
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const result = await sql`SELECT version()`;

    return NextResponse.json({
      success: true,
      message: "Connexion à Neon réussie",
      version: result[0].version,
    });
  } catch (error) {
    console.error("Erreur de connexion à Neon :", error);

    return NextResponse.json(
      { success: false, message: "Échec de la connexion à Neon" },
      { status: 500 },
    );
  }
}
