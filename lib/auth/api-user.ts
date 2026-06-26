import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";
import { getUserIdFromMobileSessionToken, readBearerToken } from "@/lib/auth/mobile-session";

export async function getAuthenticatedUserId(request?: Request) {
  if (request) {
    const bearerToken = readBearerToken(request);
    if (bearerToken) {
      const userId = await getUserIdFromMobileSessionToken(bearerToken);
      if (userId) {
        return userId;
      }
    }
  }

  const session = await getServerSession(authOptions);
  return session?.user?.id;
}
