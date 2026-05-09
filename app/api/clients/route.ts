import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizePhone, type Client } from "@/lib/crm";

type ClientRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  city: string | null;
  comment: string | null;
  notes: string | null;
  created_at: string;
};

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || "",
    birthDate: row.birth_date || "",
    city: row.city || "",
    comment: row.comment || "",
    notes: row.notes || "",
    createdAt: row.created_at,
  };
}

function normalizeSupabaseUrl(value: string) {
  return new URL(value).origin;
}

function getServerAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  return createClient(normalizeSupabaseUrl(supabaseUrl), supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/clients",
    writes: "server-anon",
  });
}

export async function POST(request: Request) {
  try {
    const input = await request.json();

    if (!input.name?.trim() || !input.phone?.trim()) {
      return NextResponse.json(
        { error: "Введите имя клиента и номер телефона." },
        { status: 400 }
      );
    }

    const db = getServerAnonClient();
    const createdAt = new Date().toISOString();
    const clientPayload = {
      name: input.name.trim(),
      phone: input.phone.trim(),
      normalized_phone: normalizePhone(input.phone),
      email: input.email?.trim() || null,
      birth_date: input.birthDate || null,
      city: input.city?.trim() || null,
      comment: input.comment?.trim() || null,
      notes: input.notes?.trim() || null,
      created_at: createdAt,
    };

    let result = await db
      .from("clients")
      .insert(clientPayload)
      .select("*")
      .single();

    if (
      result.error?.code === "PGRST204" &&
      result.error.message.includes("normalized_phone")
    ) {
      const fallbackPayload: Omit<typeof clientPayload, "normalized_phone"> &
        Partial<Pick<typeof clientPayload, "normalized_phone">> = {
        ...clientPayload,
      };
      delete fallbackPayload.normalized_phone;

      result = await db
        .from("clients")
        .insert(fallbackPayload)
        .select("*")
        .single();
    }

    if (result.error) {
      console.error("Create client failed", {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
      });

      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(mapClient(result.data as ClientRow));
  } catch (error) {
    console.error("Create client route failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось сохранить клиента.",
      },
      { status: 500 }
    );
  }
}
