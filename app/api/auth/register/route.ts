import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { email, password, name, role } = body;
  console.log("Registering user:", { email, name, role });
  return NextResponse.json({
    message: "User registered",
    email
  });
}