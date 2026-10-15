import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Calendar,
  Header,
  Label,
  Notice,
  Screen,
  SectionLabel,
  StatusChip,
} from "../../../src/components/ui";
import {
  LogModal,
  TrackingRow,
  CommitmentCard,
  type LogSelection,
} from "../../../src/components/commitments";
import {
  canLog,
  dateInZone,
  formatDate,
  isScheduled,
  validDate,
} from "../../../src/domain/commitments";
import { useData } from "../../../src/state/data";
export default function History() {
  const params = useLocalSearchParams<{ date?: string }>();
  const { snapshot, now, error, refresh } = useData();
  const [date, setDate] = useState(
    params.date && validDate(params.date) ? params.date : dateInZone(now),
  );
  const [selection, setSelection] = useState<LogSelection | null>(null);
  useEffect(() => {
    if (params.date && validDate(params.date)) setDate(params.date);
  }, [params.date]);
  const entries = snapshot.commitments.filter((c) => isScheduled(c, date));
  return (
    <Screen header={<Header />} contentStyle={{ gap: 24, paddingTop: 12 }}>
      <SectionLabel>History</SectionLabel>
      {error && <Notice message={error} onRetry={() => void refresh()} />}
      <Calendar selected={date} onSelect={setDate} />
      <Label bold>{formatDate(date)}</Label>
      {entries.length ? (
        entries.map((c) => (
          <View key={c.id}>
            <StatusChip status={c.status} />
            <TrackingRow
              commitment={c}
              date={date}
              onPress={() =>
                canLog(c, date, now)
                  ? setSelection({ commitment: c, date })
                  : router.push({
                      pathname: "/commitment/[id]",
                      params: { id: c.id },
                    })
              }
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Details for ${c.name}`}
              onPress={() =>
                router.push({
                  pathname: "/commitment/[id]",
                  params: { id: c.id },
                })
              }
              style={{ padding: 8, alignSelf: "flex-end" }}
            >
              <Label size={11} muted>
                View commitment →
              </Label>
            </Pressable>
          </View>
        ))
      ) : (
        <Label size={13} muted>
          No commitments scheduled for this date.
        </Label>
      )}
      <SectionLabel>Past attempts</SectionLabel>
      {snapshot.commitments
        .filter((c) => c.status === "completed" || c.status === "broken")
        .map((c) => (
          <CommitmentCard key={c.id} commitment={c} />
        ))}
      {!snapshot.commitments.some(
        (c) => c.status === "completed" || c.status === "broken",
      ) && (
        <Label size={13} muted>
          Your completed and broken attempts will stay here.
        </Label>
      )}
      <LogModal selection={selection} onClose={() => setSelection(null)} />
    </Screen>
  );
}
