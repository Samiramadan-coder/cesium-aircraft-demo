"use server";

import { setAuthToken } from "../api/auth-token";

export async function login() {
  await setAuthToken("Test");
}
