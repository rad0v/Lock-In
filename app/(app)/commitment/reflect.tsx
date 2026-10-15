import React, { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import {
  Button,
  ErrorNote,
  Field,
  Header,
  Label,
  Panel,
  Screen,
  StatusChip,
  Title,
  s,
} from "../../../src/components/ui";
import { useData } from "../../../src/state/data";

export default function Reflection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { snapshot, restart, loading } = useData();
  const c = snapshot.commitments.find((c) => c.id === id);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const requestId = useRef(Crypto.randomUUID());
  const start = async (skip = false) => {
    if (!c || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await restart(
        c,
        requestId.current,
        skip ? "" : reason,
        skip ? "" : note,
      );
      router.replace({ pathname: "/commitment/[id]", params: { id: next.id } });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your restart was not saved. Please retry.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  if (loading || !c || c.status !== "broken")
    return (
      <Screen header={<Header back />}>
        <Label>
          {loading
            ? "Loading your commitment…"
            : "This reflection is available for a broken attempt."}
        </Label>
      </Screen>
    );
  return (
    <Screen
      setup
      header={<Header back />}
      contentStyle={{ gap: 24, paddingTop: 24 }}
      footer={
        <Button
          title={c.restartedBy ? "VIEW NEW ATTEMPT" : "Secure Log & Restart"}
          onPress={() => void start()}
          loading={busy}
        />
      }
    >
      <View>
        <Title>Why did it Unlock?</Title>
        <Label muted size={13} style={{ marginTop: 8 }}>
          No judgment here. This is your private space to document the friction
          so you can adapt tomorrow.
        </Label>
      </View>
      <Panel>
        <View style={[s.spread, { alignItems: "flex-start" }]}>
          <Title style={{ flex: 1 }}>{c.name}</Title>
          <StatusChip status="broken" />
        </View>
        {!!c.description && (
          <Label size={13} muted>
            {c.description}
          </Label>
        )}
        {c.restartedBy ? (
          <Label>
            Your reflection and previous attempt are preserved in History.
          </Label>
        ) : (
          <>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 24,
              }}
            >
              {[
                "Low Energy",
                "Time Crunch",
                "Lack of focus",
                "Social Plans",
              ].map((r) => (
                <View key={r} style={{ width: "47%" }}>
                  <Button
                    light
                    selected={reason === r}
                    title={r}
                    onPress={() => {
                      setReason(reason === r ? "" : r);
                      setNote("");
                    }}
                    disabled={busy}
                  />
                </View>
              ))}
            </View>
            <Label
              muted
              size={12}
              style={{ textAlign: "center", marginVertical: 20 }}
            >
              OR
            </Label>
            <Field
              accessibilityLabel="Your reflection (optional)"
              placeholder="What got in the way?"
              multiline
              style={{ minHeight: 72 }}
              maxLength={500}
              value={note}
              editable={!busy}
              onChangeText={(v) => {
                setNote(v);
                setReason("");
              }}
            />
            <Label size={11} muted>
              {note.length}/500
            </Label>
          </>
        )}
      </Panel>
      <Label muted size={13} style={{ textAlign: "center" }}>
        Your reflection stays with this attempt in your private history on this
        device.
      </Label>
      {!c.restartedBy && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="SKIP REFLECTION & RESTART"
          onPress={() => void start(true)}
          disabled={busy}
          style={{
            minHeight: 48,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Label size={12}>Skip reflection & restart</Label>
        </Pressable>
      )}
      {!!error && <ErrorNote message={error} />}
    </Screen>
  );
}
