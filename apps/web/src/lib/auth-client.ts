import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

import { API_BASE_URL } from "@/lib/api-config";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [magicLinkClient()],
});

export const { signIn, signOut, useSession } = authClient;
