import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { hostKycStatusLabel, type HostKycCheckStatus } from '@fuhara/core/kyc';
import {
  Button,
  Card,
  Loading,
  Notice,
  Screen,
  SectionTitle,
  StatusPill,
  Subtitle,
  Title,
  textStyles,
} from '../../components/ui';
import { beginHostKyc, loadAccountContext } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import type { HostContext } from '../../lib/types';
import { colors, spacing } from '../../theme';

type ProgressState = 'complete' | 'current' | 'locked' | 'attention';

function checkState(status: HostKycCheckStatus): ProgressState {
  if (status === 'verified') return 'complete';
  if (status === 'failed') return 'attention';
  if (status === 'pending' || status === 'manual_review') return 'current';
  return 'locked';
}

function ProgressStep({
  number,
  title,
  owner,
  state,
  detail,
}: {
  number: number;
  title: string;
  owner: string;
  state: ProgressState;
  detail: string;
}) {
  const statusLabel = {
    complete: 'Complete',
    current: 'In progress',
    locked: 'Not started',
    attention: 'Needs attention',
  }[state];
  const tone =
    state === 'complete'
      ? 'success'
      : state === 'current' || state === 'attention'
        ? 'warning'
        : 'neutral';

  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepNumber,
          state === 'complete' && styles.stepNumberDone,
        ]}
        accessibilityElementsHidden
      >
        {state === 'complete' ? (
          <Check size={16} color={colors.tealDark} strokeWidth={2.5} />
        ) : (
          <Text style={styles.stepNumberText}>{number}</Text>
        )}
      </View>
      <View style={styles.stepCopy}>
        <View style={styles.stepHeading}>
          <Text style={styles.stepTitle}>{title}</Text>
          <StatusPill tone={tone}>{statusLabel}</StatusPill>
        </View>
        <Text style={styles.stepOwner}>{owner}</Text>
        <Text style={textStyles.muted}>{detail}</Text>
      </View>
    </View>
  );
}

export default function HostKyc() {
  const [context, setContext] = useState<HostContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setContext(await loadAccountContext());
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function begin() {
    setBusy(true);
    setMessage('');
    try {
      await beginHostKyc();
      setMessage('Identity verification started.');
      await load();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading label="Loading verification…" />;
  const kyc = context?.kyc;

  return (
    <Screen>
      <Title>Become a verified host.</Title>
      <Subtitle>
        Phone, NIN, BVN and face checks help protect guests, hosts and future
        payouts. Complete each available step, then Fuhara reviews your application.
      </Subtitle>
      {message ? <Notice>{message}</Notice> : null}

      {!kyc ? (
        <Card>
          <SectionTitle>Start host verification</SectionTitle>
          <Text style={textStyles.body}>
            By continuing, you consent to identity, phone and liveness
            verification for hosting.
          </Text>
          <Button
            label={busy ? 'Starting…' : 'Consent and start'}
            onPress={begin}
            disabled={busy}
          />
        </Card>
      ) : (
        <>
          <Card>
            <SectionTitle>Your progress</SectionTitle>
            <StatusPill
              tone={kyc.host_status === 'verified' ? 'success' : 'warning'}
            >
              {kyc.host_status === 'verified' ? 'Approved' : kyc.host_status === 'rejected' ? 'Needs attention' : 'In progress'}
            </StatusPill>
            <Text style={textStyles.body}>
              {kyc.listing_access
                ? 'You can create and submit properties.'
                : kyc.ready_for_admin_review
                  ? 'Your checks are complete. Fuhara must now make the final decision.'
                  : 'Complete the next identity step to move forward.'}
            </Text>
          </Card>

          <Card>
            <SectionTitle>Verification checklist</SectionTitle>
            <ProgressStep
              number={1}
              title="Consent"
              owner="Your action"
              state={kyc.consent.complete ? 'complete' : 'current'}
              detail={
                kyc.consent.complete
                  ? 'Identity-verification consent recorded.'
                  : 'Review and accept the verification consent.'
              }
            />
            <ProgressStep
              number={2}
              title="Phone OTP"
              owner="Your action · secure phone check"
              state={checkState(kyc.phone.status)}
              detail={`${hostKycStatusLabel(kyc.phone.status)}${kyc.phone.masked ? ` · ${kyc.phone.masked}` : ''}`}
            />
            <ProgressStep
              number={3}
              title="NIN identity match"
              owner="Approved provider connection required"
              state={checkState(kyc.nin.status)}
              detail={hostKycStatusLabel(kyc.nin.status)}
            />
            <ProgressStep
              number={4}
              title="BVN identity match"
              owner="Approved provider connection required"
              state={checkState(kyc.bvn.status)}
              detail={hostKycStatusLabel(kyc.bvn.status)}
            />
            <ProgressStep
              number={5}
              title="Face and liveness"
              owner="Approved provider connection required"
              state={checkState(kyc.face.status)}
              detail={hostKycStatusLabel(kyc.face.status)}
            />
            <ProgressStep
              number={6}
              title="Fuhara review"
              owner="Fuhara action"
              state={
                kyc.host_status === 'verified'
                  ? 'complete'
                  : kyc.host_status === 'rejected'
                    ? 'attention'
                    : kyc.ready_for_admin_review ||
                        kyc.host_status === 'in_review'
                      ? 'current'
                      : 'locked'
              }
              detail={
                kyc.host_status === 'verified'
                  ? 'Final host review approved.'
                  : kyc.host_status === 'rejected'
                    ? context?.host?.rejection_reason ||
                      'Review was not approved. Contact support for next steps.'
                    : kyc.ready_for_admin_review ||
                        kyc.host_status === 'in_review'
                      ? 'Waiting for a Fuhara reviewer. You do not need to resubmit.'
                      : 'This unlocks after every identity check passes.'
              }
            />
            <ProgressStep
              number={7}
              title="Listing access"
              owner="Automatic after approval"
              state={kyc.listing_access ? 'complete' : 'locked'}
              detail={
                kyc.listing_access
                  ? 'You can create and submit listings for review.'
                  : 'Listing creation remains locked until final approval.'
              }
            />
          </Card>
        </>
      )}

      <Card>
        <SectionTitle>Continue phone verification</SectionTitle>
        <Notice tone="warning">
          Phone verification opens the secure Fuhara web flow. NIN, BVN and
          face checks are unavailable until their verification connections are approved.
        </Notice>
        <Button
          kind="secondary"
          label="Open secure phone verification"
          onPress={() =>
            Linking.openURL(
              'https://fuhara-product-staging.vercel.app/host/onboarding',
            )
          }
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F1',
  },
  stepNumberDone: { backgroundColor: colors.softTeal },
  stepNumberText: { color: colors.tealDark, fontWeight: '900' },
  stepCopy: { flex: 1, gap: 3 },
  stepHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  stepTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  stepOwner: { color: colors.tealDark, fontSize: 12, fontWeight: '800' },
});
