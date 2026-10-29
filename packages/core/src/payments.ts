import { createHmac, timingSafeEqual } from 'node:crypto';

export const MONNIFY_PROVIDER_CODE = 'monnify' as const;
export const MONNIFY_SANDBOX_ORIGIN = 'https://sandbox.monnify.com';

type Environment = Record<string, string | undefined>;

export type PaymentRuntimeConfig = {
  enabled: true;
  provider: typeof MONNIFY_PROVIDER_CODE;
  mode: 'sandbox';
  monnifyApiKey: string;
  monnifySecretKey: string;
  monnifyContractCode: string;
  monnifyBankCode: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  appOrigin: string;
  allowedProjectRef: string;
};

export type PaymentRuntimeState =
  | { enabled: false; configured: false }
  | { enabled: true; configured: true; config: PaymentRuntimeConfig };

export type ProviderAccountInput = {
  amountKobo: bigint;
  currencyCode: 'NGN';
  customerEmail: string;
  customerName: string;
  providerReference: string;
  callbackUrl: string;
  bookingId: string;
  paymentIntentId: string;
};

export type ProviderVirtualAccount = {
  providerCode: typeof MONNIFY_PROVIDER_CODE;
  providerReference: string;
  providerTransactionReference: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  bankCode: string;
  expiresAt: string;
  isTest: true;
};

export type ProviderPaymentEvent = {
  providerCode: typeof MONNIFY_PROVIDER_CODE;
  providerEventId: string;
  providerReference: string;
  eventType: 'payment.succeeded' | 'payment.failed';
  amountKobo: bigint;
  currencyCode: string;
  isTest: true;
  environment: 'staging';
  sanitizedPayload: Record<string, string | number | null>;
};

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConfigurationError';
  }
}

export class PaymentProviderError extends Error {
  readonly kind: 'unavailable' | 'rejected' | 'invalid_response';

  constructor(
    kind: 'unavailable' | 'rejected' | 'invalid_response',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentProviderError';
    this.kind = kind;
  }
}

function required(env: Environment, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new PaymentConfigurationError(`${name} is required.`);
  return value;
}

function serviceRoleKey(value: string) {
  if (value.startsWith('sb_secret_')) return true;
  const payload = value.split('.')[1];
  if (!payload) return false;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as { role?: string };
    return decoded.role === 'service_role';
  } catch {
    return false;
  }
}

export function paymentRuntimeState(env: Environment): PaymentRuntimeState {
  const enabledValue = env.PAYMENTS_ENABLED?.trim().toLowerCase();
  if (!enabledValue || enabledValue === 'false') {
    return { enabled: false, configured: false };
  }
  if (enabledValue !== 'true') {
    throw new PaymentConfigurationError(
      'PAYMENTS_ENABLED must be true or false.',
    );
  }
  if (env.VERCEL_ENV === 'production') {
    throw new PaymentConfigurationError(
      'Monnify sandbox payments are forbidden in a production deployment.',
    );
  }

  const provider = required(env, 'PAYMENT_PROVIDER').toLowerCase();
  if (provider !== MONNIFY_PROVIDER_CODE) {
    throw new PaymentConfigurationError(
      'PAYMENT_PROVIDER must be monnify for Phase 5.1.',
    );
  }
  const mode = required(env, 'MONNIFY_MODE').toLowerCase();
  if (mode !== 'sandbox') {
    throw new PaymentConfigurationError(
      'MONNIFY_MODE must remain sandbox until a future production approval.',
    );
  }

  const monnifyApiKey = required(env, 'MONNIFY_API_KEY');
  const monnifySecretKey = required(env, 'MONNIFY_SECRET_KEY');
  const monnifyContractCode = required(env, 'MONNIFY_CONTRACT_CODE');
  const monnifyBankCode = required(env, 'MONNIFY_BANK_CODE');
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(monnifyApiKey)) {
    throw new PaymentConfigurationError('MONNIFY_API_KEY is malformed.');
  }
  if (monnifySecretKey.length < 16 || monnifySecretKey.length > 200) {
    throw new PaymentConfigurationError('MONNIFY_SECRET_KEY is malformed.');
  }
  if (!/^[A-Za-z0-9_-]{4,100}$/.test(monnifyContractCode)) {
    throw new PaymentConfigurationError('MONNIFY_CONTRACT_CODE is malformed.');
  }
  if (!/^\d{3,10}$/.test(monnifyBankCode)) {
    throw new PaymentConfigurationError('MONNIFY_BANK_CODE is malformed.');
  }

  const allowedProjectRef = required(
    env,
    'PAYMENTS_ALLOWED_SUPABASE_PROJECT_REF',
  );
  const supabaseUrl = required(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const parsedSupabaseUrl = new URL(supabaseUrl);
  if (
    parsedSupabaseUrl.protocol !== 'https:' ||
    parsedSupabaseUrl.hostname !== `${allowedProjectRef}.supabase.co`
  ) {
    throw new PaymentConfigurationError(
      'NEXT_PUBLIC_SUPABASE_URL does not match PAYMENTS_ALLOWED_SUPABASE_PROJECT_REF.',
    );
  }

  const supabaseServiceRoleKey = required(env, 'SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey(supabaseServiceRoleKey)) {
    throw new PaymentConfigurationError(
      'SUPABASE_SERVICE_ROLE_KEY must be a server-only service-role key.',
    );
  }

  const appUrl = new URL(required(env, 'NEXT_PUBLIC_APP_URL'));
  if (
    appUrl.username ||
    appUrl.password ||
    appUrl.pathname !== '/' ||
    appUrl.search ||
    appUrl.hash ||
    (appUrl.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(appUrl.hostname))
  ) {
    throw new PaymentConfigurationError(
      'NEXT_PUBLIC_APP_URL must be an HTTPS origin (or loopback for local tests).',
    );
  }

  return {
    enabled: true,
    configured: true,
    config: {
      enabled: true,
      provider: MONNIFY_PROVIDER_CODE,
      mode: 'sandbox',
      monnifyApiKey,
      monnifySecretKey,
      monnifyContractCode,
      monnifyBankCode,
      supabaseUrl: parsedSupabaseUrl.origin,
      supabaseServiceRoleKey,
      appOrigin: appUrl.origin,
      allowedProjectRef,
    },
  };
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function safeText(value: unknown, max = 160) {
  return typeof value === 'string' ? value.slice(0, max) : null;
}

function requiredText(value: unknown, name: string, max = 255) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new PaymentProviderError(
      'invalid_response',
      `Monnify returned an invalid ${name}.`,
    );
  }
  return value.trim();
}

function amountToKobo(value: unknown) {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw new PaymentProviderError(
      'invalid_response',
      'Monnify returned an invalid amount.',
    );
  }
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function koboToNaira(amount: bigint) {
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new PaymentProviderError(
      'rejected',
      'Only positive NGN snapshot amounts are supported.',
    );
  }
  return Number(amount) / 100;
}

async function responseJson(response: Response, label: string) {
  try {
    return await response.json();
  } catch {
    throw new PaymentProviderError(
      'invalid_response',
      `${label} returned invalid JSON.`,
    );
  }
}

function ensureOk(response: Response, decoded: unknown, label: string) {
  const envelope = object(decoded);
  if (!response.ok || envelope?.requestSuccessful !== true) {
    const responseCode = safeText(envelope?.responseCode, 40);
    const responseMessage = safeText(envelope?.responseMessage, 160);
    const providerReason = [responseCode, responseMessage]
      .filter(Boolean)
      .join(': ');
    throw new PaymentProviderError(
      response.status >= 500 ? 'unavailable' : 'rejected',
      `${label} rejected the request${providerReason ? ` (${providerReason})` : ''}.`,
    );
  }
  const body = object(envelope.responseBody);
  if (!body) {
    throw new PaymentProviderError(
      'invalid_response',
      `${label} returned an invalid response.`,
    );
  }
  return body;
}

export function verifyMonnifySignature(
  rawBody: string,
  signature: string | null,
  secretKey: string,
) {
  if (!signature || !/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac('sha512', secretKey)
    .update(rawBody, 'utf8')
    .digest();
  const received = Buffer.from(signature, 'hex');
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

export function parseSignedMonnifyEvent(
  rawBody: string,
  signature: string | null,
  secretKey: string,
): ProviderPaymentEvent | null {
  if (!verifyMonnifySignature(rawBody, signature, secretKey)) {
    throw new PaymentProviderError('rejected', 'Invalid Monnify signature.');
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(rawBody);
  } catch {
    throw new PaymentProviderError('invalid_response', 'Invalid webhook JSON.');
  }
  const payload = object(decoded);
  const eventType = payload?.eventType;
  const data = object(payload?.eventData);
  if (
    eventType !== 'SUCCESSFUL_TRANSACTION' &&
    eventType !== 'REJECTED_PAYMENT'
  ) {
    return null;
  }
  const providerReference = requiredText(
    data?.paymentReference,
    'payment reference',
    200,
  );
  const transactionReference = requiredText(
    data?.transactionReference,
    'transaction reference',
    200,
  );
  const currency = safeText(data?.currency ?? data?.currencyCode, 8);
  if (!currency) {
    throw new PaymentProviderError(
      'invalid_response',
      'Monnify webhook currency is invalid.',
    );
  }
  const amountKobo = amountToKobo(data?.amountPaid ?? data?.amount);
  const status = safeText(data?.paymentStatus, 80);
  if (eventType === 'SUCCESSFUL_TRANSACTION' && status !== 'PAID') {
    throw new PaymentProviderError(
      'invalid_response',
      'Monnify success event has a non-paid status.',
    );
  }
  return {
    providerCode: MONNIFY_PROVIDER_CODE,
    providerEventId: `${eventType}:${transactionReference}`,
    providerReference,
    eventType:
      eventType === 'SUCCESSFUL_TRANSACTION'
        ? 'payment.succeeded'
        : 'payment.failed',
    amountKobo,
    currencyCode: currency.toUpperCase(),
    isTest: true,
    environment: 'staging',
    sanitizedPayload: {
      transaction_reference: transactionReference,
      provider_status: status,
      payment_method: safeText(data?.paymentMethod),
      paid_on: safeText(data?.paidOn),
    },
  };
}

export interface PaymentProviderAdapter {
  readonly code: typeof MONNIFY_PROVIDER_CODE;
  readonly mode: 'sandbox';
  initialize(input: ProviderAccountInput): Promise<ProviderVirtualAccount>;
  parseWebhook(
    rawBody: string,
    signature: string | null,
  ): ProviderPaymentEvent | null;
}

export function createMonnifyAdapter(
  config: PaymentRuntimeConfig,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
): PaymentProviderAdapter {
  async function token() {
    const credentials = Buffer.from(
      `${config.monnifyApiKey}:${config.monnifySecretKey}`,
      'utf8',
    ).toString('base64');
    const response = await fetcher(
      `${MONNIFY_SANDBOX_ORIGIN}/api/v1/auth/login`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${credentials}` },
        cache: 'no-store',
      },
    ).catch(() => {
      throw new PaymentProviderError(
        'unavailable',
        'Monnify authentication could not be reached.',
      );
    });
    const body = ensureOk(
      response,
      await responseJson(response, 'Monnify authentication'),
      'Monnify authentication',
    );
    return requiredText(body.accessToken, 'access token', 4096);
  }

  return {
    code: MONNIFY_PROVIDER_CODE,
    mode: 'sandbox',
    async initialize(input) {
      if (input.currencyCode !== 'NGN') {
        throw new PaymentProviderError(
          'rejected',
          'Only positive NGN snapshot amounts are supported.',
        );
      }
      const accessToken = await token();
      const initResponse = await fetcher(
        `${MONNIFY_SANDBOX_ORIGIN}/api/v1/merchant/transactions/init-transaction`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: koboToNaira(input.amountKobo),
            customerEmail: input.customerEmail,
            customerName: input.customerName,
            paymentReference: input.providerReference,
            paymentDescription: `Fuhara booking ${input.bookingId}`,
            currencyCode: input.currencyCode,
            contractCode: config.monnifyContractCode,
            redirectUrl: input.callbackUrl,
            paymentMethods: ['ACCOUNT_TRANSFER'],
            metadata: {
              booking_id: input.bookingId,
              payment_intent_id: input.paymentIntentId,
              environment: 'staging',
            },
          }),
          cache: 'no-store',
        },
      ).catch(() => {
        throw new PaymentProviderError(
          'unavailable',
          'Monnify transaction initialization could not be reached.',
        );
      });
      const initBody = ensureOk(
        initResponse,
        await responseJson(initResponse, 'Monnify transaction initialization'),
        'Monnify transaction initialization',
      );
      const paymentReference = requiredText(
        initBody.paymentReference,
        'payment reference',
        200,
      );
      if (paymentReference !== input.providerReference) {
        throw new PaymentProviderError(
          'invalid_response',
          'Monnify changed the payment reference.',
        );
      }
      const transactionReference = requiredText(
        initBody.transactionReference,
        'transaction reference',
        200,
      );

      const accountResponse = await fetcher(
        `${MONNIFY_SANDBOX_ORIGIN}/api/v1/merchant/bank-transfer/init-payment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactionReference,
          }),
          cache: 'no-store',
        },
      ).catch(() => {
        throw new PaymentProviderError(
          'unavailable',
          'Monnify virtual-account generation could not be reached.',
        );
      });
      const accountBody = ensureOk(
        accountResponse,
        await responseJson(
          accountResponse,
          'Monnify virtual-account generation',
        ),
        'Monnify virtual-account generation',
      );
      const returnedTransaction = accountBody.transactionReference;
      if (
        returnedTransaction != null &&
        returnedTransaction !== transactionReference
      ) {
        throw new PaymentProviderError(
          'invalid_response',
          'Monnify changed the transaction reference.',
        );
      }
      const durationValue =
        typeof accountBody.accountDurationSeconds === 'number'
          ? accountBody.accountDurationSeconds
          : typeof accountBody.accountDuration === 'number'
            ? accountBody.accountDuration
            : 2400;
      const durationSeconds = Math.max(
        60,
        Math.min(2400, Math.trunc(durationValue)),
      );
      return {
        providerCode: MONNIFY_PROVIDER_CODE,
        providerReference: paymentReference,
        providerTransactionReference: transactionReference,
        accountNumber: requiredText(
          accountBody.accountNumber,
          'account number',
          32,
        ),
        accountName: requiredText(accountBody.accountName, 'account name'),
        bankName: requiredText(accountBody.bankName, 'bank name'),
        bankCode: safeText(accountBody.bankCode, 20) ?? config.monnifyBankCode,
        expiresAt: new Date(now() + durationSeconds * 1000).toISOString(),
        isTest: true,
      };
    },
    parseWebhook(rawBody, signature) {
      return parseSignedMonnifyEvent(
        rawBody,
        signature,
        config.monnifySecretKey,
      );
    },
  };
}

export function maskProviderReference(value: string | null | undefined) {
  if (!value) return null;
  const tail = value.slice(-6);
  return `${'•'.repeat(Math.max(4, Math.min(10, value.length - tail.length)))}${tail}`;
}
