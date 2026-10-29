import { useEffect, useState } from 'react';
import { Text } from 'react-native';
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
import { loadPayoutReadiness } from '../../lib/api';
import { errorMessage } from '../../lib/errors';
import type { PayoutReadiness } from '../../lib/types';

const label = (value: string) =>
  value.replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());

export default function Payouts() {
  const [data, setData] = useState<PayoutReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  async function load() {
    setLoading(true);
    setMessage('');
    try {
      setData(await loadPayoutReadiness());
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  if (loading) return <Loading label="Checking payout readiness…" />;
  if (!data)
    return (
      <Screen>
        <Notice tone="error">{message}</Notice>
        <Button kind="secondary" label="Try again" onPress={load} />
      </Screen>
    );
  return (
    <Screen>
      <Title>Payout readiness</Title>
      <Subtitle>
        View-only payout readiness. Fuhara cannot send payouts during beta.
      </Subtitle>
      <Notice tone="warning">
        You can review readiness here, but no payout can be sent or marked paid
        from the app during beta.
      </Notice>
      <Card>
        <SectionTitle>Readiness</SectionTitle>
        <StatusPill tone={data.payout_ready ? 'success' : 'warning'}>
          {data.payout_ready ? 'Ready' : 'Blocked'}
        </StatusPill>
        {data.blockers.map((blocker) => (
          <Text style={textStyles.body} key={blocker}>
            • {label(blocker)}
          </Text>
        ))}
      </Card>
      <Card>
        <SectionTitle>Masked destination</SectionTitle>
        {data.payout_account ? (
          <>
            <Text style={textStyles.body}>
              {data.payout_account.bank_name || 'Bank'} ·{' '}
              {data.payout_account.account_number_masked || '••••'}
            </Text>
            <Text style={textStyles.muted}>
              {data.payout_account.resolved_account_name || 'Name not resolved'}{' '}
              · {label(data.payout_account.verification_status || 'pending')}
            </Text>
          </>
        ) : (
          <Text style={textStyles.body}>
            No verified payout destination configured.
          </Text>
        )}
      </Card>
      <Button kind="secondary" label="Refresh status" onPress={load} />
    </Screen>
  );
}
