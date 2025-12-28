/**
 * Test factories for creating mock data
 * Use these to create consistent test data across tests
 */

/**
 * Create a mock upload object
 */
export function createMockUpload(overrides: Partial<MockUpload> = {}): MockUpload {
  return {
    id: `upload_${Date.now()}`,
    email: "test@example.com",
    sessionToken: `session_${Math.random().toString(36).slice(2)}`,
    originalUrl: "https://example.com/uploads/original.jpg",
    status: "pending",
    stage: undefined,
    progress: 0,
    createdAt: new Date(),
    ...overrides,
  };
}

interface MockUpload {
  id: string;
  email: string;
  sessionToken: string;
  originalUrl: string;
  status: "pending" | "processing" | "completed" | "failed";
  stage?: "validating" | "generating" | "watermarking" | "complete";
  progress: number;
  createdAt: Date;
}

/**
 * Create a mock result object
 */
export function createMockResult(overrides: Partial<MockResult> = {}): MockResult {
  return {
    id: `result_${Date.now()}`,
    uploadId: `upload_${Date.now()}`,
    resultUrl: "https://example.com/results/full.jpg",
    previewUrl: "https://example.com/results/preview.jpg",
    createdAt: new Date(),
    ...overrides,
  };
}

interface MockResult {
  id: string;
  uploadId: string;
  resultUrl: string;
  previewUrl: string;
  createdAt: Date;
}

/**
 * Create a mock purchase object
 */
export function createMockPurchase(overrides: Partial<MockPurchase> = {}): MockPurchase {
  return {
    id: `purchase_${Date.now()}`,
    resultId: `result_${Date.now()}`,
    email: "buyer@example.com",
    stripeSessionId: `cs_test_${Math.random().toString(36).slice(2)}`,
    amount: 999,
    type: "self",
    createdAt: new Date(),
    ...overrides,
  };
}

interface MockPurchase {
  id: string;
  resultId: string;
  email: string;
  stripeSessionId: string;
  amount: number;
  type: "self" | "gift";
  createdAt: Date;
}

/**
 * Create a mock presigned URL response
 */
export function createMockPresignedUrl(
  overrides: Partial<MockPresignedUrl> = {},
): MockPresignedUrl {
  return {
    url: `https://r2.example.com/upload?token=${Math.random().toString(36).slice(2)}`,
    key: `uploads/${Date.now()}/image.jpg`,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    ...overrides,
  };
}

interface MockPresignedUrl {
  url: string;
  key: string;
  expiresAt: Date;
}
