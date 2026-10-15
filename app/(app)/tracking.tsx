import React, { useState } from "react";
import { Header, Label, Notice, Screen } from "../../src/components/ui";
import {
  LogModal,
  TrackingRow,
  type LogSelection,
} from "../../src/components/commitments";
import { dueRows } from "../../src/domain/commitments";
import { useData } from "../../src/state/data";
export default function Tracking() {
  const { snapshot, now, error, refresh } = useData();
  const [selected, setSelected] = useState<LogSelection | null>(null);
  const rows = dueRows(snapshot, now);
  return (
    <Screen
      header={<Header back label="Today's Tracking" />}
      contentStyle={{ gap: 16, paddingTop: 24 }}
    >
      {error && <Notice message={error} onRetry={() => void refresh()} />}{" "}
      {!rows.length && <Label>No commitments due today.</Label>}
      {rows.map((row) => (
        <TrackingRow
          key={row.commitment.id + row.date}
          {...row}
          onPress={() => setSelected(row)}
        />
      ))}
      <LogModal selection={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}
