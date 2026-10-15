import React, { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Button,
  Header,
  Icon,
  Label,
  Notice,
  Screen,
  SectionLabel,
  s,
} from "../components/ui";
import {
  CommitmentCard,
  LogModal,
  TrackingRow,
  type LogSelection,
} from "../components/commitments";
import {
  addDays,
  dateInZone,
  dayOfWeek,
  dueRows,
  weekdays,
  type Status,
} from "../domain/commitments";
import { useData } from "../state/data";
import { useSession } from "../state/session";
import { color } from "../theme";
import { feedback } from "../lib/feedback";

export default function FocusScreen() {
  const { snapshot, loading, error, refresh, now } = useData();
  const { identity } = useSession();
  const [filter, setFilter] = useState<Status | "all">("active");
  const [selected, setSelected] = useState<LogSelection | null>(null);
  const today = dateInZone(now),
    monday = addDays(today, -dayOfWeek(today));
  const current = snapshot.commitments.filter(
    (c) => c.status !== "completed" && !c.restartedBy,
  );
  const filtered = current.filter(
    (c) => filter === "all" || c.status === filter,
  );
  const rows = dueRows(snapshot, now);
  if (loading)
    return (
      <Screen header={<Header />} contentStyle={{ justifyContent: "center" }}>
        <ActivityIndicator color={color.ink.primary} />
      </Screen>
    );
  if (!current.length)
    return (
      <Screen
        header={<Header />}
        contentStyle={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 80,
        }}
      >
        {error && <Notice message={error} onRetry={() => void refresh()} />}
        <Button
          title=""
          icon="plus"
          accessibilityLabel="Create your first commitment"
          light
          onPress={() => router.push("/commitment/new")}
          style={{ width: 64 }}
        />
        <Label size={13} bold style={{ marginTop: 20 }}>
          No active commitments found.
        </Label>
        <Label muted style={{ textAlign: "center", marginTop: 4 }}>
          Tap the icon above to lock in your first target.
        </Label>
      </Screen>
    );
  return (
    <Screen header={<Header />} contentStyle={{ gap: 24 }}>
      {error && <Notice message={error} onRetry={() => void refresh()} />}
      <View
        style={{
          backgroundColor: color.surface.hero,
          padding: 20,
          borderRadius: 28,
          borderBottomWidth: 1,
          borderColor: "#9D9994",
          gap: 20,
        }}
      >
        <View style={[s.spread, { alignItems: "flex-start", gap: 4 }]}>
          <View style={{ flex: 1 }}>
            <Label size={10}>
              ☼ Good{" "}
              {now.getHours() < 12
                ? "Morning"
                : now.getHours() < 17
                  ? "Afternoon"
                  : "Evening"}
              ,
            </Label>
            <Label size={16} bold>
              {identity?.name || "Your next chapter"}
            </Label>
          </View>
          <View style={{ flexDirection: "row" }}>
            {weekdays.map((w, i) => {
              const date = addDays(monday, i),
                active = date === today;
              return (
                <Pressable
                  key={w}
                  accessibilityRole="button"
                  accessibilityLabel={`History for ${date}`}
                  onPress={() =>
                    router.navigate({ pathname: "/history", params: { date } })
                  }
                  style={{
                    alignItems: "center",
                    width: 23,
                    gap: 7,
                    paddingVertical: 2,
                  }}
                >
                  <Label size={9} muted>
                    {w[0]}
                  </Label>
                  <View
                    style={{
                      backgroundColor: active
                        ? color.ink.primary
                        : "transparent",
                      borderRadius: 20,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Label
                      size={10}
                      style={{ color: active ? "#FFFFFF" : color.ink.muted }}
                    >
                      {Number(date.slice(-2))}
                    </Label>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View
          style={{
            backgroundColor: color.ink.primary,
            marginRight: 3,
            marginBottom: 4,
            transform: [{ translateX: 3 }, { translateY: 4 }],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Lock in new commitment"
            onPress={() => router.push("/commitment/new")}
            style={[
              s.spread,
              {
                padding: 16,
                backgroundColor: color.surface.panel,
                borderWidth: 1,
                borderColor: color.ink.primary,
                transform: [{ translateX: -3 }, { translateY: -4 }],
              },
            ]}
          >
            <View style={{ backgroundColor: color.ink.primary, padding: 10 }}>
              <Icon name="lock" tint="#FFFFFF" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Label size={12} bold>
                LOCK-IN NEW{String.fromCharCode(10)}COMMITMENT
              </Label>
              <Label size={10} muted>
                Start a new habit matrix here
              </Label>
            </View>
            <Icon name="arrow-right" />
          </Pressable>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <SectionHeader
          title="Today's Tracking"
          onPress={() => router.push("/tracking")}
        />
        {rows.length ? (
          rows
            .slice(0, 4)
            .map((row) => (
              <TrackingRow
                key={row.commitment.id + row.date}
                {...row}
                onPress={() => setSelected(row)}
              />
            ))
        ) : (
          <Label size={13} muted>
            No commitments due today.
          </Label>
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          justifyContent: "space-between",
        }}
      >
        {(["all", "active", "paused", "broken"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`Filter ${value}`}
            accessibilityState={{ selected: filter === value }}
            onPress={() => {
              if (filter !== value) feedback();
              setFilter(value);
            }}
            style={{
              flex: 1,
              paddingVertical: 9,
              alignItems: "center",
              borderRadius: 28,
              backgroundColor:
                filter === value ? color.ink.focus : color.surface.hero,
              boxShadow: "0px 2px 2px rgba(37,31,26,0.2)",
            }}
          >
            <Label
              size={12}
              style={{
                color: filter === value ? "#FFFFFF" : color.ink.primary,
                textTransform: "capitalize",
              }}
            >
              {value}
            </Label>
          </Pressable>
        ))}
      </View>
      {!filtered.length ? (
        <Label size={13} style={{ textAlign: "center", marginTop: 48 }}>
          No {filter === "all" ? "current" : filter} commitments found.
        </Label>
      ) : (
        (["build", "quit"] as const).map((path) => {
          const cards = filtered.filter((c) => c.path === path);
          return cards.length ? (
            <View key={path} style={{ gap: 16 }}>
              <SectionHeader
                title={path === "build" ? "Building Habits" : "Quitting Habits"}
                onPress={() =>
                  router.push({
                    pathname: "/commitments",
                    params: { path, status: filter },
                  })
                }
              />
              {cards.slice(0, 3).map((c) => (
                <CommitmentCard key={c.id} commitment={c} />
              ))}
            </View>
          ) : null;
        })
      )}
      <LogModal selection={selected} onClose={() => setSelected(null)} />
    </Screen>
  );
}
function SectionHeader({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <View style={s.spread}>
      <SectionLabel>{title}</SectionLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View all ${title.toLowerCase()}`}
        onPress={onPress}
        hitSlop={8}
        style={{ paddingVertical: 8 }}
      >
        <Label size={10} muted>
          View all →
        </Label>
      </Pressable>
    </View>
  );
}
