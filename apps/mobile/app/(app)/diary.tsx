import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { moodTags, tierOptions } from "@/lib/constants";
import { mobileApi } from "@/lib/api";

type TrackOption = { id: string; title: string; genre: string; artist: { name: string }; album: { title: string } };

export default function DiaryScreen() {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState("");
  const [tier, setTier] = useState<(typeof tierOptions)[number]["value"]>("HEAVY_ROTATION");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const selectedTrack = useMemo(() => tracks.find((track) => track.id === selectedTrackId) ?? null, [tracks, selectedTrackId]);

  async function searchCatalog(nextQuery: string) {
    setQuery(nextQuery);
    const data = await mobileApi.searchCatalog(nextQuery);
    setTracks(data.tracks);
    setSelectedTrackId(data.tracks[0]?.id ?? "");
  }

  return (
    <Screen>
      <Heading>Diary</Heading>
      <Card>
        <Title>Search track</Title>
        <TextInput value={query} onChangeText={(value) => void searchCatalog(value)} placeholder="Search title, artist, genre" style={inputStyle} />
        {tracks.map((track) => (
          <Pressable key={track.id} onPress={() => setSelectedTrackId(track.id)} style={{ paddingVertical: 8 }}>
            <Copy style={{ color: selectedTrackId === track.id ? "#18181b" : undefined }}>{track.title} • {track.artist.name}</Copy>
          </Pressable>
        ))}
      </Card>

      {selectedTrack ? (
        <Card>
          <Title>{selectedTrack.title}</Title>
          <Copy>{selectedTrack.artist.name} • {selectedTrack.album.title} • {selectedTrack.genre}</Copy>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {tierOptions.map((option) => (
              <Pressable key={option.value} onPress={() => setTier(option.value)} style={[chipStyle, tier === option.value && activeChipStyle]}>
                <Copy style={{ color: tier === option.value ? "#fafafa" : undefined }}>{option.label}</Copy>
              </Pressable>
            ))}
          </View>
          <TextInput value={note} onChangeText={setNote} placeholder="Why did this hit?" multiline style={[inputStyle, { marginTop: 12, minHeight: 90 }]} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {moodTags.map((tag) => {
              const active = tags.includes(tag);
              return (
                <Pressable key={tag} onPress={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} style={[chipStyle, active && activeChipStyle]}>
                  <Copy style={{ color: active ? "#fafafa" : undefined }}>{tag}</Copy>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={async () => {
              if (!selectedTrackId) {
                return;
              }
              const result = await mobileApi.createDiaryEntry({ trackId: selectedTrackId, tier, note, tags });
              setMessage(result.shouldPromptPlacement ? "Saved. Open Pairwise to sharpen placement." : "Saved to your diary.");
              setNote("");
            }}
            style={[buttonStyle, { marginTop: 14 }]}
          >
            <Title style={{ color: "#fafafa", fontSize: 16 }}>Save entry</Title>
          </Pressable>
          {message ? <Copy style={{ marginTop: 10 }}>{message}</Copy> : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const inputStyle = { borderWidth: 1, borderColor: "#e4e4e7", borderRadius: 12, padding: 12, backgroundColor: "#fff" } as const;
const chipStyle = { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#e4e4e7" } as const;
const activeChipStyle = { backgroundColor: "#18181b" } as const;
const buttonStyle = { backgroundColor: "#18181b", borderRadius: 12, padding: 14, alignItems: "center" } as const;