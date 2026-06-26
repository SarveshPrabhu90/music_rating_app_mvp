import { useEffect, useMemo, useState } from "react";
import { TextInput, View } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { mobileApi } from "@/lib/api";

type FriendsData = Awaited<ReturnType<typeof mobileApi.getFriends>>;
type SearchData = Awaited<ReturnType<typeof mobileApi.searchPeople>>;

export default function FriendsScreen() {
  const [friends, setFriends] = useState<FriendsData | null>(null);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchData | null>(null);
  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    mobileApi.getFriends().then(setFriends).catch(() => setFriends(null));
  }, []);

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    let active = true;

    mobileApi.searchPeople(trimmedQuery)
      .then((result) => {
        if (active) {
          setSearchResults(result);
        }
      })
      .catch(() => {
        if (active) {
          setSearchResults(null);
        }
      });

    return () => {
      active = false;
    };
  }, [trimmedQuery]);

  const visibleResults = trimmedQuery ? searchResults?.results ?? [] : [];

  return (
    <Screen>
      <Heading>Friends</Heading>
      <Card>
        <Title>Search people</Title>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search name or username" style={{ borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 12, padding: 12 }} />
        {visibleResults.map((user) => (
          <View key={user.id} style={{ gap: 4 }}>
            <Copy>{user.name} • @{user.username}</Copy>
            <Copy>{user.relationship}</Copy>
          </View>
        ))}
      </Card>
      <Card>
        <Title>Friends</Title>
        {friends?.accepted.length ? friends.accepted.map((friendship) => (
          <Copy key={friendship.id}>{friendship.user.name} • @{friendship.user.username}</Copy>
        )) : <Copy>No friends yet.</Copy>}
      </Card>
      <Card>
        <Title>Incoming</Title>
        {friends?.incoming.length ? friends.incoming.map((friendship) => (
          <Copy key={friendship.id}>{friendship.user.name} • @{friendship.user.username}</Copy>
        )) : <Copy>No incoming requests.</Copy>}
      </Card>
    </Screen>
  );
}