import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { Env } from "../config/env.schema";

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;

  constructor(private readonly env: Env) {
    if (
      env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY
    ) {
      const existing = getApps().find((a) => a.name === "portfolio");
      this.app =
        existing ??
        initializeApp(
          {
            credential: cert({
              projectId: env.FIREBASE_PROJECT_ID,
              clientEmail: env.FIREBASE_CLIENT_EMAIL,
              // env files commonly escape newlines as literal \n; normalize.
              privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
          },
          "portfolio",
        );
    } else {
      this.logger.warn("FirebaseService: credentials missing — Google sign-in disabled.");
    }
  }

  async verifyGoogleIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.app) {
      throw new UnauthorizedException("Google sign-in is not configured");
    }
    try {
      const decoded = await getAuth(this.app).verifyIdToken(idToken, true);
      if (decoded.firebase.sign_in_provider !== "google.com") {
        throw new UnauthorizedException("Only Google sign-in is accepted via this endpoint");
      }
      return decoded;
    } catch (err) {
      this.logger.warn(`Firebase token verification failed: ${(err as Error).message}`);
      throw new UnauthorizedException("Invalid Google ID token");
    }
  }
}
