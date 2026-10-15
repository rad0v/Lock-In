import React, { useEffect, useState } from "react";
import { Linking, Switch, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  ErrorNote,
  Field,
  Header,
  Icon,
  Label,
  ModalCard,
  Screen,
  SectionLabel,
} from "../../../src/components/ui";
import { useSession } from "../../../src/state/session";
import { color } from "../../../src/theme";
import { usePreferences } from "../../../src/state/preferences";
import { useReminders } from "../../../src/state/reminders";
import {
  notificationPermission,
  notificationsSupported,
  syncReminders,
  testReminder,
} from "../../../src/lib/notifications";
export default function Settings() {
  const { identity, signOut } = useSession();
  const { preferences, reduced, ready, update } = usePreferences();
  const { status, retry } = useReminders();
  const [time, setTime] = useState(preferences.reminderTime);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(
    () => setTime(preferences.reminderTime),
    [preferences.reminderTime],
  );
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const savePreference = async (action: () => Promise<void>) => {
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your preference was not saved. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  };
  const toggleReminders = (enabled: boolean) =>
    void savePreference(async () => {
      if (enabled && !(await notificationPermission(true)))
        throw new Error(
          "Allow notifications in your device settings, then try again.",
        );
      if (!enabled) await syncReminders([]);
      await update({ reminders: enabled });
    });
  const exit = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch {
      setError("Could not sign out. Please try again.");
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen header={<Header />} contentStyle={{ gap: 24, paddingTop: 12 }}>
      <SectionLabel>Settings</SectionLabel>
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Icon name="user" size={32} />
          <View style={{ flex: 1 }}>
            <Label bold size={19}>
              {identity?.mode === "device"
                ? "On this device"
                : identity?.name || "Your account"}
            </Label>
            <Label size={13} muted>
              {identity?.email ||
                (identity?.mode === "device"
                  ? "Saved locally. No account required."
                  : "Signed in")}
            </Label>
          </View>
        </View>
        <Divider />
        <Label size={13} muted>
          {identity?.mode === "device"
            ? "Your commitments are stored on this device and are not synced to an account."
            : "Your commitments are private to your account."}
        </Label>
      </Card>
      <Card>
        <Label bold>Motion & accessibility</Label>
        <Label size={13} muted style={{ marginTop: 8 }}>
          LockIn follows your device’s reduced motion and text size settings.
        </Label>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <Label>Reduce motion</Label>
          <Switch
            accessibilityLabel="Reduce motion"
            value={preferences.motion === "reduced"}
            disabled={!ready || saving}
            onValueChange={(v) =>
              void savePreference(() =>
                update({ motion: v ? "reduced" : "system" }),
              )
            }
            trackColor={{ true: color.success.background }}
          />
        </View>
        <Label muted size={12}>
          {reduced
            ? "Reduced motion is active."
            : "Following your device settings."}
        </Label>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 16,
          }}
        >
          <Label>Haptic feedback</Label>
          <Switch
            accessibilityLabel="Haptic feedback"
            value={preferences.haptics}
            disabled={!ready || saving}
            onValueChange={(v) =>
              void savePreference(() => update({ haptics: v }))
            }
            trackColor={{ true: color.success.background }}
          />
        </View>
        <Label muted size={12}>
          Gentle feedback for choices and saved progress.
        </Label>
      </Card>
      <Card style={{ gap: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Label bold>Daily reminders</Label>
          <Switch
            accessibilityLabel="Daily reminders"
            value={preferences.reminders}
            disabled={!notificationsSupported || !ready || saving}
            onValueChange={toggleReminders}
            trackColor={{ true: color.success.background }}
          />
        </View>
        <Label size={13} muted>
          {notificationsSupported
            ? "A quiet nudge at your chosen time in each commitment’s time zone. Reminders stop when you pause, finish, or break an attempt."
            : "Reminders are available in the Android app. You can choose your time here."}
        </Label>
        <Field
          label="Reminder time (24-hour)"
          value={time}
          onChangeText={setTime}
          maxLength={5}
          placeholder="20:00"
        />
        <Button
          light
          title="SAVE REMINDER TIME"
          loading={saving}
          disabled={!ready}
          onPress={() =>
            void savePreference(async () => {
              await update({ reminderTime: time });
              setMessage("Reminder time saved.");
            })
          }
        />
        {!!status && (
          <Label size={12} muted>
            {status}
          </Label>
        )}
        {notificationsSupported && (
          <>
            <Button
              light
              title="SEND TEST REMINDER"
              disabled={saving || !preferences.reminders}
              onPress={() =>
                void savePreference(async () => {
                  await testReminder();
                  setMessage("Test reminder scheduled in 5 seconds.");
                })
              }
            />
            <Button
              light
              title="REFRESH REMINDERS"
              onPress={retry}
              disabled={saving}
            />
            <Button
              light
              title="OPEN DEVICE SETTINGS"
              onPress={() =>
                void Linking.openSettings().catch(() =>
                  setError("Could not open device settings."),
                )
              }
            />
          </>
        )}
        <Label size={11} muted>
          Reminders have no habit names or private notes on your lock screen.
          Check-ins update the schedule; your device may delay delivery.
        </Label>
      </Card>
      {!!message && (
        <Label accessibilityLiveRegion="polite" size={13}>
          {message}
        </Label>
      )}
      {!!error && <ErrorNote message={error} />}
      <Button
        light
        title={identity?.mode === "device" ? "LEAVE LOCAL SESSION" : "SIGN OUT"}
        onPress={() => setConfirm(true)}
      />
      <Label size={11} muted style={{ textAlign: "center" }}>
        LockIn · 0.1.0
      </Label>
      <ModalCard
        visible={confirm}
        title={
          identity?.mode === "device" ? "Leave this session?" : "Sign out?"
        }
        onClose={() => setConfirm(false)}
        busy={busy}
      >
        <Label>
          {identity?.mode === "device"
            ? "Your local commitments will remain on this device. Choose Continue on this device to return."
            : "Your private data will be cleared from this device’s cache."}
        </Label>
        <Button
          title={identity?.mode === "device" ? "LEAVE SESSION" : "SIGN OUT"}
          loading={busy}
          onPress={() => void exit()}
        />
        <Button
          light
          title="STAY HERE"
          disabled={busy}
          onPress={() => setConfirm(false)}
        />
      </ModalCard>
    </Screen>
  );
}
