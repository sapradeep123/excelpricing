import type { Request, Response, NextFunction } from "express";
import { logError, logWarn } from "../logger";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

interface RecaptchaVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  score?: number;
  action?: string;
  "error-codes"?: string[];
}

export async function verifyRecaptcha(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip reCAPTCHA in development mode if env var is not set
  if (process.env.NODE_ENV === "development" && !RECAPTCHA_SECRET_KEY) {
    logWarn("reCAPTCHA verification skipped in development mode");
    return next();
  }

  if (!RECAPTCHA_SECRET_KEY) {
    logError("RECAPTCHA_SECRET_KEY is not configured");
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

  const token = req.body.recaptchaToken;

  if (!token) {
    logWarn("Missing reCAPTCHA token", { ip: req.ip, path: req.path });
    res.status(400).json({ message: "reCAPTCHA verification required" });
    return;
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: token,
        remoteip: req.ip || "",
      }),
    });

    const data: RecaptchaVerifyResponse = await response.json();

    if (!data.success) {
      logWarn("reCAPTCHA verification failed", {
        ip: req.ip,
        errors: data["error-codes"],
      });
      res.status(400).json({
        message: "reCAPTCHA verification failed. Please try again.",
      });
      return;
    }

    // For reCAPTCHA v3, check the score (0.0 to 1.0)
    // Score of 0.5 or higher is generally considered human
    if (data.score !== undefined && data.score < 0.5) {
      logWarn("reCAPTCHA score too low", {
        ip: req.ip,
        score: data.score,
      });
      res.status(400).json({
        message: "reCAPTCHA verification failed. Please try again.",
      });
      return;
    }

    // Verification successful
    next();
  } catch (error) {
    logError("reCAPTCHA verification error", error, {
      ip: req.ip,
      path: req.path,
    });
    res.status(500).json({
      message: "Error verifying reCAPTCHA. Please try again.",
    });
  }
}
