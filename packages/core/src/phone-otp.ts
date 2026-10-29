export type HostPhoneOtpState = {
  message: string;
  success?: boolean;
  stage?: 'code_sent' | 'verified';
  remainingAttempts?: number;
};

export type HostPhoneOtpEnvironment = {
  supabaseUrl: string;
  serviceRoleKey: string;
  termii: TermiiConfig;
};

export type TermiiConfig = {
  baseUrl: string;
  apiKey: string;
  senderId: string;
  channel: 'dnd' | 'generic';
};

export type RpcErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export type OtpRpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: RpcErrorLike | null }>;

export type TermiiProvider = {
  send(phoneE164: string): Promise<{ pinId: string }>;
  verify(
    pinId: string,
    code: string,
  ): Promise<{ verified: boolean; phoneE164: string | null }>;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function required(values: Record<string, string | undefined>, name: string) {
  const value = values[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function httpsOrigin(value: string, name: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !['', '/'].includes(url.pathname) ||
    url.search ||
    url.hash
  )
    throw new Error(`${name} must be an HTTPS origin.`);
  return url.origin;
}

function jwtRole(value: string) {
  try {
    const encoded = value.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return record(JSON.parse(atob(padded)))?.role;
  } catch {
    return null;
  }
}

export function parseHostPhoneOtpEnvironment(
  values: Record<string, string | undefined>,
): HostPhoneOtpEnvironment {
  const supabaseUrl = httpsOrigin(
    required(values, 'NEXT_PUBLIC_SUPABASE_URL'),
    'NEXT_PUBLIC_SUPABASE_URL',
  );
  const serviceRoleKey = required(values, 'SUPABASE_SERVICE_ROLE_KEY');
  if (
    serviceRoleKey.startsWith('sb_publishable_') ||
    (!serviceRoleKey.startsWith('sb_secret_') &&
      jwtRole(serviceRoleKey) !== 'service_role')
  )
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret or legacy service_role key.',
    );
  if (serviceRoleKey === values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY must not be the public Supabase key.',
    );

  const baseUrl = httpsOrigin(
    required(values, 'TERMII_BASE_URL'),
    'TERMII_BASE_URL',
  );
  const apiKey = required(values, 'TERMII_API_KEY');
  if (apiKey.length < 8 || /\s/.test(apiKey))
    throw new Error('TERMII_API_KEY is invalid.');
  const senderId = required(values, 'TERMII_SENDER_ID');
  if (!/^[A-Za-z0-9]{1,20}$/.test(senderId))
    throw new Error('TERMII_SENDER_ID must be an approved alphanumeric ID.');
  const channel = required(values, 'TERMII_CHANNEL').toLowerCase();
  if (channel !== 'dnd' && channel !== 'generic')
    throw new Error('TERMII_CHANNEL must be dnd or generic.');

  return {
    supabaseUrl,
    serviceRoleKey,
    termii: { baseUrl, apiKey, senderId, channel },
  };
}

export function parseOtpCode(value: unknown) {
  return typeof value === 'string' && /^\d{6}$/.test(value.trim())
    ? value.trim()
    : null;
}

export function normalizeNigerianProviderPhone(value: unknown) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/[^0-9]/g, '');
  return /^234[789][0-9]{9}$/.test(digits) ? `+${digits}` : null;
}

export function parseTermiiSendResponse(value: unknown) {
  const body = record(value);
  if (!body) return null;
  const candidate = body.pin_id ?? body.pinId;
  if (typeof candidate !== 'string' || !candidate.trim()) return null;
  const returnedPhone = body.phone_number ?? body.to;
  return {
    pinId: candidate.trim(),
    phoneE164:
      returnedPhone === undefined
        ? null
        : normalizeNigerianProviderPhone(returnedPhone),
  };
}

export function parseTermiiVerifyResponse(value: unknown) {
  const body = record(value);
  if (!body || !('verified' in body)) return null;
  const verified =
    body.verified === true ||
    (typeof body.verified === 'string' &&
      body.verified.toLowerCase() === 'true');
  const pin = body.pin_id ?? body.pinId;
  return {
    verified,
    pinId: typeof pin === 'string' && pin.trim() ? pin.trim() : null,
    phoneE164: normalizeNigerianProviderPhone(body.msisdn),
  };
}

export type TermiiFailureKind =
  | 'authentication'
  | 'rate_limited'
  | 'rejected'
  | 'unavailable'
  | 'network'
  | 'invalid_response';

export class TermiiApiError extends Error {
  readonly kind: TermiiFailureKind;
  readonly status?: number;

  constructor(kind: TermiiFailureKind, status?: number) {
    super(`Termii request failed: ${kind}`);
    this.name = 'TermiiApiError';
    this.kind = kind;
    this.status = status;
  }
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function failureKind(status: number): TermiiFailureKind {
  if (status === 401 || status === 403) return 'authentication';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'unavailable';
  return 'rejected';
}

async function termiiPost(
  config: TermiiConfig,
  path: string,
  payload: UnknownRecord,
  fetcher: FetchLike,
) {
  let response: Response;
  try {
    response = await fetcher(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: config.apiKey, ...payload }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new TermiiApiError('network');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new TermiiApiError(
      response.ok ? 'invalid_response' : failureKind(response.status),
      response.status,
    );
  }
  if (!response.ok)
    throw new TermiiApiError(failureKind(response.status), response.status);
  return body;
}

export function createTermiiProvider(
  config: TermiiConfig,
  fetcher: FetchLike = fetch,
): TermiiProvider {
  return {
    async send(phoneE164) {
      const normalized = normalizeNigerianProviderPhone(phoneE164);
      if (!normalized) throw new TermiiApiError('rejected');
      const body = await termiiPost(
        config,
        '/api/sms/otp/send',
        {
          message_type: 'NUMERIC',
          pin_type: 'NUMERIC',
          to: normalized.slice(1),
          from: config.senderId,
          channel: config.channel,
          pin_attempts: 5,
          pin_time_to_live: 5,
          pin_length: 6,
          pin_placeholder: '< 123456 >',
          message_text:
            'Your Fuhara verification code is < 123456 >. It expires in 5 minutes.',
        },
        fetcher,
      );
      const result = parseTermiiSendResponse(body);
      if (!result || (result.phoneE164 && result.phoneE164 !== normalized))
        throw new TermiiApiError('invalid_response');
      return { pinId: result.pinId };
    },
    async verify(pinId, code) {
      const body = await termiiPost(
        config,
        '/api/sms/otp/verify',
        { pin_id: pinId, pin: code },
        fetcher,
      );
      const result = parseTermiiVerifyResponse(body);
      if (!result || (result.pinId && result.pinId !== pinId))
        throw new TermiiApiError('invalid_response');
      if (result.verified && !result.phoneE164)
        throw new TermiiApiError('invalid_response');
      return { verified: result.verified, phoneE164: result.phoneE164 };
    },
  };
}

function errorText(error: RpcErrorLike | null) {
  return [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
}

export function otpRpcErrorMessage(
  error: RpcErrorLike | null,
  operation: 'send' | 'verify',
) {
  const text = errorText(error);
  if (text.includes('OTP_COOLDOWN'))
    return 'Please wait 60 seconds before requesting another code.';
  if (text.includes('OTP_RATE_LIMIT_15M'))
    return 'Too many codes were requested. Wait 15 minutes before trying again.';
  if (text.includes('OTP_RATE_LIMIT_24H'))
    return 'The daily code limit has been reached. Try again tomorrow.';
  if (text.includes('OTP_ALREADY_VERIFIED'))
    return 'This phone number is already verified.';
  if (text.includes('OTP_CONSENT_REQUIRED'))
    return 'Record your identity-verification consent before requesting a code.';
  if (
    text.includes('OTP_HOST_ACCESS_REQUIRED') ||
    text.includes('OTP_KYC_NOT_STARTED')
  )
    return 'Start Strong Host KYC before verifying your phone.';
  if (text.includes('OTP_PHONE_INVALID'))
    return 'Add a valid Nigerian mobile number to your profile, then try again.';
  if (text.includes('OTP_NOT_AVAILABLE'))
    return 'Send a new verification code before trying to verify.';
  if (text.includes('OTP_EXPIRED'))
    return 'That code has expired. Send a new code and try again.';
  if (text.includes('OTP_ATTEMPTS_EXCEEDED'))
    return 'Too many incorrect attempts. Send a new code to continue.';
  return operation === 'send'
    ? 'A verification code could not be sent. Please try again.'
    : 'The code could not be verified. Please try again.';
}

function providerMessage(error: unknown, operation: 'send' | 'verify') {
  if (!(error instanceof TermiiApiError))
    return operation === 'send'
      ? 'A verification code could not be sent. Please try again.'
      : 'The code could not be verified. Please try again.';
  if (error.kind === 'rate_limited')
    return 'The verification service is receiving too many requests. Please wait and try again.';
  if (error.kind === 'unavailable' || error.kind === 'network')
    return 'The verification service is temporarily unavailable. Please try again.';
  return operation === 'send'
    ? 'The verification service could not send a code. Please try again.'
    : 'The verification service could not check that code. Please try again.';
}

function providerReason(error: unknown) {
  return error instanceof TermiiApiError
    ? `termii_${error.kind}`
    : 'provider_error';
}

function uuid(value: unknown) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}

function preparedChallenge(value: unknown) {
  const body = record(value);
  const challengeId = uuid(body?.challenge_id);
  const phoneE164 = normalizeNigerianProviderPhone(body?.phone_e164);
  return challengeId && phoneE164 ? { challengeId, phoneE164 } : null;
}

function verificationAttempt(value: unknown) {
  const body = record(value);
  const challengeId = uuid(body?.challenge_id);
  const phoneE164 = normalizeNigerianProviderPhone(body?.phone_e164);
  const providerReference = body?.provider_reference;
  const remainingAttempts = body?.remaining_attempts;
  return challengeId &&
    phoneE164 &&
    typeof providerReference === 'string' &&
    providerReference.trim() &&
    Number.isInteger(remainingAttempts) &&
    Number(remainingAttempts) >= 0
    ? {
        challengeId,
        phoneE164,
        providerReference: providerReference.trim(),
        remainingAttempts: Number(remainingAttempts),
      }
    : null;
}

function rejection(value: unknown) {
  const body = record(value);
  return body &&
    typeof body.exhausted === 'boolean' &&
    Number.isInteger(body.remaining_attempts) &&
    Number(body.remaining_attempts) >= 0
    ? {
        exhausted: body.exhausted,
        remainingAttempts: Number(body.remaining_attempts),
      }
    : null;
}

async function abandon(
  rpc: OtpRpc,
  userId: string,
  challengeId: string,
  reason: string,
) {
  try {
    await rpc('abandon_host_phone_otp_v1', {
      p_user_id: userId,
      p_challenge_id: challengeId,
      p_reason: reason,
    });
  } catch {
    // Best-effort cleanup only. The short-lived challenge remains unusable until marked sent.
  }
}

export async function runSendHostPhoneOtp(
  userId: string,
  rpc: OtpRpc,
  provider: TermiiProvider,
): Promise<HostPhoneOtpState> {
  const prepared = await rpc('prepare_host_phone_otp_v1', {
    p_user_id: userId,
  });
  if (prepared.error)
    return { message: otpRpcErrorMessage(prepared.error, 'send') };
  const challenge = preparedChallenge(prepared.data);
  if (!challenge)
    return {
      message: 'A verification code could not be prepared. Please try again.',
    };

  let sent: { pinId: string };
  try {
    sent = await provider.send(challenge.phoneE164);
  } catch (error) {
    await abandon(rpc, userId, challenge.challengeId, providerReason(error));
    return { message: providerMessage(error, 'send') };
  }

  const marked = await rpc('mark_host_phone_otp_sent_v1', {
    p_user_id: userId,
    p_challenge_id: challenge.challengeId,
    p_provider_reference: sent.pinId,
  });
  if (marked.error) {
    await abandon(rpc, userId, challenge.challengeId, 'state_update_failed');
    return { message: otpRpcErrorMessage(marked.error, 'send') };
  }
  return {
    message: 'Code sent. Enter the six-digit code within 5 minutes.',
    success: true,
    stage: 'code_sent',
  };
}

export async function runVerifyHostPhoneOtp(
  userId: string,
  codeValue: unknown,
  rpc: OtpRpc,
  provider: TermiiProvider,
): Promise<HostPhoneOtpState> {
  const code = parseOtpCode(codeValue);
  if (!code) return { message: 'Enter the six-digit verification code.' };

  const begun = await rpc('begin_host_phone_otp_verify_v1', {
    p_user_id: userId,
  });
  if (begun.error)
    return { message: otpRpcErrorMessage(begun.error, 'verify') };
  const attempt = verificationAttempt(begun.data);
  if (!attempt)
    return {
      message:
        'The verification attempt could not be prepared. Send a new code.',
    };

  let result: { verified: boolean; phoneE164: string | null };
  try {
    result = await provider.verify(attempt.providerReference, code);
  } catch (error) {
    return {
      message: providerMessage(error, 'verify'),
      remainingAttempts: attempt.remainingAttempts,
    };
  }

  if (!result.verified) {
    const rejected = await rpc('reject_host_phone_otp_v1', {
      p_user_id: userId,
      p_challenge_id: attempt.challengeId,
    });
    if (rejected.error)
      return { message: otpRpcErrorMessage(rejected.error, 'verify') };
    const outcome = rejection(rejected.data);
    if (!outcome)
      return {
        message: 'The invalid attempt could not be recorded. Send a new code.',
      };
    return {
      message: outcome.exhausted
        ? 'That code was not accepted and no attempts remain. Send a new code.'
        : `That code was not accepted. ${outcome.remainingAttempts} attempt${outcome.remainingAttempts === 1 ? '' : 's'} remaining.`,
      remainingAttempts: outcome.remainingAttempts,
    };
  }

  if (!result.phoneE164 || result.phoneE164 !== attempt.phoneE164)
    return {
      message:
        'The provider response did not match your profile phone. Send a new code or contact support.',
      remainingAttempts: attempt.remainingAttempts,
    };

  const completed = await rpc('complete_host_phone_otp_v1', {
    p_user_id: userId,
    p_challenge_id: attempt.challengeId,
    p_provider_reference: attempt.providerReference,
    p_verified_phone_e164: result.phoneE164,
  });
  if (completed.error)
    return { message: otpRpcErrorMessage(completed.error, 'verify') };
  return {
    message: 'Phone verified. Continue to your NIN identity check.',
    success: true,
    stage: 'verified',
  };
}
