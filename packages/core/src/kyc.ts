export const hostKycCheckStatuses = [
  'not_started',
  'pending',
  'verified',
  'failed',
  'manual_review',
] as const;

export type HostKycCheckStatus = (typeof hostKycCheckStatuses)[number];

export type HostKycStatus = {
  host_status: 'pending' | 'in_review' | 'verified' | 'rejected';
  consent: {
    complete: boolean;
    version: string | null;
    accepted_at: string | null;
  };
  phone: {
    status: HostKycCheckStatus;
    masked: string | null;
    verified_at: string | null;
  };
  nin: {
    status: HostKycCheckStatus;
    last4: string | null;
    name_match: boolean | null;
    dob_match: boolean | null;
    verified_at: string | null;
  };
  bvn: {
    status: HostKycCheckStatus;
    last4: string | null;
    name_match: boolean | null;
    dob_match: boolean | null;
    verified_at: string | null;
  };
  face: {
    status: HostKycCheckStatus;
    face_match: boolean | null;
    liveness: boolean | null;
    verified_at: string | null;
  };
  ready_for_admin_review: boolean;
  listing_access: boolean;
};

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function nullableString(value: unknown) {
  return typeof value === 'string' ? value : value === null ? null : undefined;
}

function nullableBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : value === null ? null : undefined;
}

function checkStatus(value: unknown): HostKycCheckStatus | null {
  return hostKycCheckStatuses.includes(value as HostKycCheckStatus)
    ? (value as HostKycCheckStatus)
    : null;
}

export function parseHostKycStatus(value: unknown): HostKycStatus | null {
  const root = record(value);
  const consent = record(root?.consent);
  const phone = record(root?.phone);
  const nin = record(root?.nin);
  const bvn = record(root?.bvn);
  const face = record(root?.face);
  const hostStatus = root?.host_status;
  const phoneStatus = checkStatus(phone?.status);
  const ninStatus = checkStatus(nin?.status);
  const bvnStatus = checkStatus(bvn?.status);
  const faceStatus = checkStatus(face?.status);

  if (
    !root ||
    !consent ||
    !phone ||
    !nin ||
    !bvn ||
    !face ||
    !['pending', 'in_review', 'verified', 'rejected'].includes(
      String(hostStatus),
    ) ||
    typeof consent.complete !== 'boolean' ||
    nullableString(consent.version) === undefined ||
    nullableString(consent.accepted_at) === undefined ||
    !phoneStatus ||
    nullableString(phone.masked) === undefined ||
    nullableString(phone.verified_at) === undefined ||
    !ninStatus ||
    nullableString(nin.last4) === undefined ||
    nullableBoolean(nin.name_match) === undefined ||
    nullableBoolean(nin.dob_match) === undefined ||
    nullableString(nin.verified_at) === undefined ||
    !bvnStatus ||
    nullableString(bvn.last4) === undefined ||
    nullableBoolean(bvn.name_match) === undefined ||
    nullableBoolean(bvn.dob_match) === undefined ||
    nullableString(bvn.verified_at) === undefined ||
    !faceStatus ||
    nullableBoolean(face.face_match) === undefined ||
    nullableBoolean(face.liveness) === undefined ||
    nullableString(face.verified_at) === undefined ||
    typeof root.ready_for_admin_review !== 'boolean' ||
    typeof root.listing_access !== 'boolean'
  ) {
    return null;
  }

  return {
    host_status: hostStatus as HostKycStatus['host_status'],
    consent: {
      complete: consent.complete,
      version: nullableString(consent.version)!,
      accepted_at: nullableString(consent.accepted_at)!,
    },
    phone: {
      status: phoneStatus,
      masked: nullableString(phone.masked)!,
      verified_at: nullableString(phone.verified_at)!,
    },
    nin: {
      status: ninStatus,
      last4: nullableString(nin.last4)!,
      name_match: nullableBoolean(nin.name_match)!,
      dob_match: nullableBoolean(nin.dob_match)!,
      verified_at: nullableString(nin.verified_at)!,
    },
    bvn: {
      status: bvnStatus,
      last4: nullableString(bvn.last4)!,
      name_match: nullableBoolean(bvn.name_match)!,
      dob_match: nullableBoolean(bvn.dob_match)!,
      verified_at: nullableString(bvn.verified_at)!,
    },
    face: {
      status: faceStatus,
      face_match: nullableBoolean(face.face_match)!,
      liveness: nullableBoolean(face.liveness)!,
      verified_at: nullableString(face.verified_at)!,
    },
    ready_for_admin_review: root.ready_for_admin_review,
    listing_access: root.listing_access,
  };
}

export function hostKycStatusLabel(status: HostKycCheckStatus) {
  return {
    not_started: 'Not started',
    pending: 'In progress',
    verified: 'Verified',
    failed: 'Needs attention',
    manual_review: 'Manual review',
  }[status];
}
