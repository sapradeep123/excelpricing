import rateLimit from "express-rate-limit";
import { logWarn } from "../logger";

// General API rate limiter - 100 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { message: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn("Rate limit exceeded", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      message: "Too many requests from this IP, please try again in 15 minutes.",
    });
  },
});

// Strict rate limiter for quote creation - 10 quotes per hour
export const quoteCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { message: "Too many quote creation requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn("Quote creation rate limit exceeded", {
      ip: req.ip,
    });
    res.status(429).json({
      message: "Too many quote creation requests. Please try again in an hour.",
    });
  },
});

// Sync endpoint rate limiter - 5 requests per hour
export const syncLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { message: "Too many sync requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logWarn("Sync rate limit exceeded", {
      ip: req.ip,
    });
    res.status(429).json({
      message: "Too many sync requests. Please try again in an hour.",
    });
  },
});

// Exchange rates limiter - 30 requests per 15 minutes
export const exchangeRatesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many exchange rate requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
