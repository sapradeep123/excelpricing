import sanitizeHtml from "sanitize-html";

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes all HTML tags and scripts
 */
export function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [], // No HTML tags allowed
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });
}

/**
 * Sanitize an object recursively, cleaning all string values
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitizeInput(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T;
  }

  if (obj !== null && typeof obj === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * Validate and sanitize quote items
 */
export function sanitizeQuoteItems(items: any[]): any[] {
  return items.map((item) => ({
    ...item,
    serviceName: typeof item.serviceName === "string" ? sanitizeInput(item.serviceName) : item.serviceName,
    description: typeof item.description === "string" ? sanitizeInput(item.description) : item.description,
  }));
}
