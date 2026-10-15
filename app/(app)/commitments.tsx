import { useLocalSearchParams } from "expo-router";
import { Header, Label, Screen } from "../../src/components/ui";
import { CommitmentCard } from "../../src/components/commitments";
import { useData } from "../../src/state/data";
export default function Commitments() {
  const { path, status } = useLocalSearchParams<{
    path?: string;
    status?: string;
  }>();
  const { snapshot } = useData();
  const cards = snapshot.commitments.filter(
    (c) =>
      (!path || c.path === path) &&
      (status === "all" || !status || c.status === status) &&
      c.status !== "completed" &&
      !c.restartedBy,
  );
  return (
    <Screen
      header={
        <Header
          back
          label={path === "quit" ? "Quitting Habits" : "Building Habits"}
        />
      }
      contentStyle={{ gap: 16, paddingTop: 24 }}
    >
      {cards.map((c) => (
        <CommitmentCard key={c.id} commitment={c} />
      ))}
      {!cards.length && <Label>No matching commitments found.</Label>}
    </Screen>
  );
}
