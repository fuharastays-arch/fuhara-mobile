import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

export const PAYSTACK_PAYOUT_VERIFICATION_PROVIDER = 'paystack' as const;
export const PAYSTACK_API_ORIGIN = 'https://api.paystack.co';
export const PAYOUT_DESTINATION_CIPHER = 'aes-256-gcm' as const;

type Environment = Record<string, string | undefined>;

export type PayoutVerificationRuntimeConfig = {
  enabled: true;
  provider: typeof PAYSTACK_PAYOUT_VERIFICATION_PROVIDER;
  mode: 'test';
  paystackSecretKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  allowedProjectRef: string;
  payoutDestinationEncryptionKey: string;
};

export type PayoutVerificationRuntimeState =
  | { enabled: false; configured: false; reason: 'configuration_required' }
  | {
      enabled: true;
      configured: true;
      config: PayoutVerificationRuntimeConfig;
    };

export type NigerianBank = { code: string; name: string };

export type ResolvedBankAccount = {
  providerCode: typeof PAYSTACK_PAYOUT_VERIFICATION_PROVIDER;
  providerVerificationReference: string;
  accountName: string;
  accountNumberLast4: string;
};

export class PayoutVerificationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayoutVerificationConfigurationError';
  }
}

export class PayoutVerificationProviderError extends Error {
  readonly kind: 'unavailable' | 'rejected' | 'invalid_response';

  constructor(
    kind: 'unavailable' | 'rejected' | 'invalid_response',
    message: string,
  ) {
    super(message);
    this.name = 'PayoutVerificationProviderError';
    this.kind = kind;
  }
}

function required(env: Environment, name: string) {
  const value = env[name]?.trim();
  if (!value)
    throw new PayoutVerificationConfigurationError(`${name} is required.`);
  return value;
}

function serviceRoleKey(value: string) {
  if (value.startsWith('sb_secret_')) return true;
  const payload = value.split('.')[1];
  if (!payload) return false;
  try {
    return (
      (
        JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
          role?: string;
        }
      ).role === 'service_role'
    );
  } catch {
    return false;
  }
}

export function payoutVerificationRuntimeState(
  env: Environment,
): PayoutVerificationRuntimeState {
  const enabled = env.PAYOUT_BANK_VERIFICATION_ENABLED?.trim().toLowerCase();
  if (!enabled || enabled === 'false') {
    return {
      enabled: false,
      configured: false,
      reason: 'configuration_required',
    };
  }
  if (enabled !== 'true') {
    throw new PayoutVerificationConfigurationError(
      'PAYOUT_BANK_VERIFICATION_ENABLED must be true or false.',
    );
  }
  if (env.VERCEL_ENV === 'production') {
    throw new PayoutVerificationConfigurationError(
      'Payout bank verification is STAGING-only for this phase.',
    );
  }

  const provider = required(
    env,
    'PAYOUT_BANK_VERIFICATION_PROVIDER',
  ).toLowerCase();
  if (provider !== PAYSTACK_PAYOUT_VERIFICATION_PROVIDER) {
    throw new PayoutVerificationConfigurationError(
      'PAYOUT_BANK_VERIFICATION_PROVIDER must be paystack for this phase.',
    );
  }
  const mode = required(env, 'PAYOUT_BANK_VERIFICATION_MODE').toLowerCase();
  if (mode !== 'test') {
    throw new PayoutVerificationConfigurationError(
      'PAYOUT_BANK_VERIFICATION_MODE must remain test.',
    );
  }
  const paystackSecretKey = required(
    env,
    'PAYSTACK_PAYOUT_VERIFICATION_SECRET_KEY',
  );
  if (!paystackSecretKey.startsWith('sk_test_')) {
    throw new PayoutVerificationConfigurationError(
      'PAYSTACK_PAYOUT_VERIFICATION_SECRET_KEY must be a Paystack test key.',
    );
  }

  const allowedProjectRef = required(
    env,
    'PAYOUTS_ALLOWED_SUPABASE_PROJECT_REF',
  );
  const parsedSupabaseUrl = new URL(required(env, 'NEXT_PUBLIC_SUPABASE_URL'));
  if (
    parsedSupabaseUrl.protocol !== 'https:' ||
    parsedSupabaseUrl.hostname !== `${allowedProjectRef}.supabase.co`
  ) {
    throw new PayoutVerificationConfigurationError(
      'NEXT_PUBLIC_SUPABASE_URL does not match PAYOUTS_ALLOWED_SUPABASE_PROJECT_REF.',
    );
  }
  const supabaseServiceRoleKey = required(env, 'SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey(supabaseServiceRoleKey)) {
    throw new PayoutVerificationConfigurationError(
      'SUPABASE_SERVICE_ROLE_KEY must be a server-only service-role key.',
    );
  }
  const payoutDestinationEncryptionKey = required(
    env,
    'PAYOUT_DESTINATION_ENCRYPTION_KEY',
  );
  decodeDestinationKey(payoutDestinationEncryptionKey);

  return {
    enabled: true,
    configured: true,
    config: {
      enabled: true,
      provider: PAYSTACK_PAYOUT_VERIFICATION_PROVIDER,
      mode: 'test',
      paystackSecretKey,
      supabaseUrl: parsedSupabaseUrl.origin,
      supabaseServiceRoleKey,
      allowedProjectRef,
      payoutDestinationEncryptionKey,
    },
  };
}

function decodeDestinationKey(value: string) {
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value) {
    throw new PayoutVerificationConfigurationError(
      'PAYOUT_DESTINATION_ENCRYPTION_KEY must be canonical base64 for exactly 32 bytes.',
    );
  }
  return key;
}

function destinationAad(payoutAccountId: string, bankCode: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      payoutAccountId,
    )
  ) {
    throw new Error('Invalid payout account identifier.');
  }
  if (!/^\d{3,10}$/.test(bankCode)) {
    throw new Error('Invalid payout bank code.');
  }
  return Buffer.from(
    `fuhara:payout-destination:v1:${payoutAccountId}:${bankCode}`,
    'utf8',
  );
}

export type SealedPayoutDestination = {
  cipher: typeof PAYOUT_DESTINATION_CIPHER;
  keyVersion: 1;
  ciphertext: string;
  iv: string;
  authTag: string;
  fingerprint: string;
};

export function sealPayoutDestination(
  input: {
    payoutAccountId: string;
    bankCode: string;
    accountNumber: string;
  },
  encryptionKey: string,
): SealedPayoutDestination {
  const { bankCode, accountNumber } = parseNigerianPayoutAccount(input);
  const key = decodeDestinationKey(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv(PAYOUT_DESTINATION_CIPHER, key, iv);
  cipher.setAAD(destinationAad(input.payoutAccountId, bankCode));
  const ciphertext = Buffer.concat([
    cipher.update(accountNumber, 'utf8'),
    cipher.final(),
  ]);
  const fingerprint = createHmac('sha256', key)
    .update(
      `fuhara:payout-destination:fingerprint:v1:${bankCode}:${accountNumber}`,
    )
    .digest('hex');
  return {
    cipher: PAYOUT_DESTINATION_CIPHER,
    keyVersion: 1,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    fingerprint,
  };
}

export function openPayoutDestination(
  input: {
    payoutAccountId: string;
    bankCode: string;
    ciphertext: string;
    iv: string;
    authTag: string;
  },
  encryptionKey: string,
) {
  const key = decodeDestinationKey(encryptionKey);
  const decipher = createDecipheriv(
    PAYOUT_DESTINATION_CIPHER,
    key,
    Buffer.from(input.iv, 'base64'),
  );
  decipher.setAAD(destinationAad(input.payoutAccountId, input.bankCode));
  decipher.setAuthTag(Buffer.from(input.authTag, 'base64'));
  const accountNumber = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, 'base64')),
    decipher.final(),
  ]).toString('utf8');
  return parseNigerianPayoutAccount({
    bankCode: input.bankCode,
    accountNumber,
  }).accountNumber;
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredText(value: unknown, label: string, max = 255) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    throw new PayoutVerificationProviderError(
      'invalid_response',
      `Paystack returned an invalid ${label}.`,
    );
  }
  return value.trim();
}

async function decode(response: Response, label: string) {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new PayoutVerificationProviderError(
      'invalid_response',
      `${label} returned invalid JSON.`,
    );
  }
  const envelope = object(payload);
  if (!response.ok || envelope?.status !== true) {
    throw new PayoutVerificationProviderError(
      response.status >= 500 ? 'unavailable' : 'rejected',
      `${label} rejected the request.`,
    );
  }
  return envelope;
}

export function parseNigerianPayoutAccount(input: {
  bankCode: unknown;
  accountNumber: unknown;
}) {
  const bankCode =
    typeof input.bankCode === 'string' ? input.bankCode.trim() : '';
  const accountNumber =
    typeof input.accountNumber === 'string'
      ? input.accountNumber.replace(/\s+/g, '')
      : '';
  if (!/^\d{3,10}$/.test(bankCode)) {
    throw new Error('Choose a valid Nigerian bank.');
  }
  if (!/^\d{10}$/.test(accountNumber)) {
    throw new Error('Enter a valid 10-digit Nigerian account number.');
  }
  return { bankCode, accountNumber };
}

export interface PayoutAccountVerificationAdapter {
  readonly code: typeof PAYSTACK_PAYOUT_VERIFICATION_PROVIDER;
  readonly mode: 'test';
  listBanks(): Promise<NigerianBank[]>;
  resolve(input: {
    bankCode: string;
    accountNumber: string;
    requestReference: string;
  }): Promise<ResolvedBankAccount>;
}

export function createPaystackPayoutVerificationAdapter(
  config: PayoutVerificationRuntimeConfig,
  fetcher: typeof fetch = fetch,
): PayoutAccountVerificationAdapter {
  const headers = { Authorization: `Bearer ${config.paystackSecretKey}` };
  return {
    code: PAYSTACK_PAYOUT_VERIFICATION_PROVIDER,
    mode: 'test',
    async listBanks() {
      const response = await fetcher(
        `${PAYSTACK_API_ORIGIN}/bank?country=nigeria&currency=NGN&use_cursor=false&perPage=100`,
        { headers, cache: 'no-store' },
      ).catch(() => {
        throw new PayoutVerificationProviderError(
          'unavailable',
          'Paystack bank directory could not be reached.',
        );
      });
      const envelope = await decode(response, 'Paystack bank directory');
      if (!Array.isArray(envelope.data)) {
        throw new PayoutVerificationProviderError(
          'invalid_response',
          'Paystack returned an invalid bank directory.',
        );
      }
      const unique = new Map<string, NigerianBank>();
      for (const item of envelope.data) {
        const bank = object(item);
        if (
          typeof bank?.code === 'string' &&
          /^\d{3,10}$/.test(bank.code) &&
          typeof bank.name === 'string' &&
          bank.name.trim()
        ) {
          unique.set(bank.code, {
            code: bank.code,
            name: bank.name.trim().slice(0, 160),
          });
        }
      }
      const banks = [...unique.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      if (!banks.length) {
        throw new PayoutVerificationProviderError(
          'invalid_response',
          'Paystack returned no Nigerian banks.',
        );
      }
      return banks;
    },
    async resolve(input) {
      const { bankCode, accountNumber } = parseNigerianPayoutAccount(input);
      const url = new URL(`${PAYSTACK_API_ORIGIN}/bank/resolve`);
      url.searchParams.set('account_number', accountNumber);
      url.searchParams.set('bank_code', bankCode);
      const response = await fetcher(url, {
        headers,
        cache: 'no-store',
      }).catch(() => {
        throw new PayoutVerificationProviderError(
          'unavailable',
          'Paystack account resolution could not be reached.',
        );
      });
      const envelope = await decode(response, 'Paystack account resolution');
      const data = object(envelope.data);
      const returnedAccount = requiredText(
        data?.account_number,
        'account number',
        20,
      );
      if (returnedAccount !== accountNumber) {
        throw new PayoutVerificationProviderError(
          'invalid_response',
          'Paystack returned a different account number.',
        );
      }
      const providerRequestId =
        response.headers.get('x-paystack-request-id')?.trim() ||
        input.requestReference;
      return {
        providerCode: PAYSTACK_PAYOUT_VERIFICATION_PROVIDER,
        providerVerificationReference: `paystack:${providerRequestId}`.slice(
          0,
          240,
        ),
        accountName: requiredText(data?.account_name, 'account name'),
        accountNumberLast4: accountNumber.slice(-4),
      };
    },
  };
}

export function maskBankAccount(last4: string) {
  if (!/^\d{4}$/.test(last4)) throw new Error('Invalid account last four.');
  return `••••••${last4}`;
}
