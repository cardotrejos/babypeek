/**
 * Facebook Conversions API Service
 *
 * Server-side tracking for Facebook Ads optimization.
 * This complements client-side Pixel tracking for better attribution.
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { Effect, Context, Layer } from "effect";

// =============================================================================
// Types
// =============================================================================

interface ServerEventData {
  event_name: string;
  event_time: number;
  event_id?: string;
  event_source_url?: string;
  action_source: "website" | "app" | "physical_store" | "phone_call" | "chat" | "email" | "other";
  user_data: UserData;
  custom_data?: CustomData;
}

interface UserData {
  client_ip_address?: string;
  client_user_agent?: string;
  em?: string[]; // Hashed email
  ph?: string[]; // Hashed phone
  external_id?: string[]; // Your user ID
  fbc?: string; // Facebook click ID
  fbp?: string; // Facebook browser ID
}

interface CustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: string;
  num_items?: number;
  [key: string]: unknown;
}

interface ConversionsAPIResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
}

export interface FacebookEventProperties {
  value?: number;
  currency?: string;
  uploadId?: string;
  email?: string;
  eventId?: string;
  ipAddress?: string;
  userAgent?: string;
  sourceUrl?: string;
  fbc?: string; // Facebook click ID from cookie
  fbp?: string; // Facebook browser ID from cookie
  [key: string]: unknown;
}

// =============================================================================
// Environment Configuration
// =============================================================================

const PIXEL_ID = process.env.FACEBOOK_PIXEL_ID;
const ACCESS_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;
const API_VERSION = "v18.0";
const GRAPH_API_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Check if Facebook Conversions API is configured
 */
export const isFacebookConfigured = (): boolean => {
  return !!(PIXEL_ID && ACCESS_TOKEN);
};

// =============================================================================
// Hashing Utility (for PII)
// =============================================================================

/**
 * Hash a value using SHA-256 (required for user data fields)
 */
const hashValue = async (value: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

// =============================================================================
// Facebook Conversions Service Definition
// =============================================================================

export class FacebookConversionsService extends Context.Tag("FacebookConversionsService")<
  FacebookConversionsService,
  {
    /**
     * Track a Purchase event (server-side)
     */
    trackPurchase: (params: {
      value: number;
      currency?: string;
      uploadId: string;
      email?: string;
      eventId?: string;
      ipAddress?: string;
      userAgent?: string;
      sourceUrl?: string;
    }) => Effect.Effect<ConversionsAPIResponse | null>;

    /**
     * Track a Lead event (server-side)
     */
    trackLead: (params: {
      uploadId: string;
      email?: string;
      eventId?: string;
      ipAddress?: string;
      userAgent?: string;
    }) => Effect.Effect<ConversionsAPIResponse | null>;

    /**
     * Track a custom event (server-side)
     */
    trackEvent: (
      eventName: string,
      properties: FacebookEventProperties,
    ) => Effect.Effect<ConversionsAPIResponse | null>;
  }
>() {}

// =============================================================================
// Core API Call
// =============================================================================

const sendEvent = async (eventData: ServerEventData): Promise<ConversionsAPIResponse | null> => {
  if (!isFacebookConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.log("[FB Conversions API] Would send:", eventData.event_name, eventData);
    }
    return null;
  }

  try {
    const url = `${GRAPH_API_URL}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [eventData],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[FB Conversions API] Error:", response.status, errorData);
      return null;
    }

    const result = (await response.json()) as ConversionsAPIResponse;

    if (process.env.NODE_ENV === "development") {
      console.log("[FB Conversions API] Success:", eventData.event_name, result);
    }

    return result;
  } catch (error) {
    console.error("[FB Conversions API] Request failed:", error);
    return null;
  }
};

// =============================================================================
// Service Implementation
// =============================================================================

const trackPurchase = Effect.fn("FacebookConversionsService.trackPurchase")(function* (params: {
  value: number;
  currency?: string;
  uploadId: string;
  email?: string;
  eventId?: string;
  ipAddress?: string;
  userAgent?: string;
  sourceUrl?: string;
}) {
  const userData: UserData = {
    client_ip_address: params.ipAddress,
    client_user_agent: params.userAgent,
    external_id: [params.uploadId],
  };

  // Hash email if provided
  if (params.email) {
    const hashedEmail = yield* Effect.promise(() => hashValue(params.email!));
    userData.em = [hashedEmail];
  }

  const eventData: ServerEventData = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    event_source_url: params.sourceUrl,
    action_source: "website",
    user_data: userData,
    custom_data: {
      value: params.value,
      currency: params.currency || "USD",
      content_name: "Baby Portrait HD",
      content_category: "AI Portrait",
      content_type: "product",
      num_items: 1,
      upload_id: params.uploadId,
    },
  };

  return yield* Effect.promise(() => sendEvent(eventData));
});

const trackLead = Effect.fn("FacebookConversionsService.trackLead")(function* (params: {
  uploadId: string;
  email?: string;
  eventId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const userData: UserData = {
    client_ip_address: params.ipAddress,
    client_user_agent: params.userAgent,
    external_id: [params.uploadId],
  };

  if (params.email) {
    const hashedEmail = yield* Effect.promise(() => hashValue(params.email!));
    userData.em = [hashedEmail];
  }

  const eventData: ServerEventData = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId,
    action_source: "website",
    user_data: userData,
    custom_data: {
      content_name: "Email Capture",
      content_category: "Upload Flow",
      upload_id: params.uploadId,
    },
  };

  return yield* Effect.promise(() => sendEvent(eventData));
});

const trackEvent = Effect.fn("FacebookConversionsService.trackEvent")(function* (
  eventName: string,
  properties: FacebookEventProperties,
) {
  const userData: UserData = {
    client_ip_address: properties.ipAddress,
    client_user_agent: properties.userAgent,
    fbc: properties.fbc,
    fbp: properties.fbp,
  };

  if (properties.uploadId) {
    userData.external_id = [properties.uploadId];
  }

  if (properties.email) {
    const hashedEmail = yield* Effect.promise(() => hashValue(properties.email!));
    userData.em = [hashedEmail];
  }

  const eventData: ServerEventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: properties.eventId,
    event_source_url: properties.sourceUrl,
    action_source: "website",
    user_data: userData,
    custom_data: {
      value: properties.value,
      currency: properties.currency || "USD",
      ...properties,
    },
  };

  return yield* Effect.promise(() => sendEvent(eventData));
});

// =============================================================================
// Layer
// =============================================================================

export const FacebookConversionsServiceLive = Layer.succeed(FacebookConversionsService, {
  trackPurchase,
  trackLead,
  trackEvent,
});

/**
 * Mock service for testing
 */
export const FacebookConversionsServiceMock = Layer.succeed(FacebookConversionsService, {
  trackPurchase: () => Effect.succeed(null),
  trackLead: () => Effect.succeed(null),
  trackEvent: () => Effect.succeed(null),
});

// =============================================================================
// Standalone Helper Functions (for use outside Effect context)
// =============================================================================

/**
 * Track a Purchase event directly (for use in webhooks)
 */
export const trackPurchaseEvent = async (params: {
  value: number;
  currency?: string;
  uploadId: string;
  email?: string;
  eventId?: string;
  stripeSessionId?: string;
}): Promise<void> => {
  if (!isFacebookConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.log("[FB Conversions API] Would track Purchase:", params);
    }
    return;
  }

  const userData: UserData = {
    external_id: [params.uploadId],
  };

  if (params.email) {
    const hashedEmail = await hashValue(params.email);
    userData.em = [hashedEmail];
  }

  const eventData: ServerEventData = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: params.eventId || `purchase_${params.uploadId}_${Date.now()}`,
    action_source: "website",
    user_data: userData,
    custom_data: {
      value: params.value,
      currency: params.currency || "USD",
      content_name: "Baby Portrait HD",
      content_category: "AI Portrait",
      content_type: "product",
      num_items: 1,
      upload_id: params.uploadId,
      stripe_session_id: params.stripeSessionId,
    },
  };

  await sendEvent(eventData);
};
