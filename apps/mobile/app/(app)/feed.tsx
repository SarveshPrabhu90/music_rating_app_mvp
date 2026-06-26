import { useEffect, useState } from "react";

import { Card } from "@/components/card";
import { Screen } from "@/components/screen";
import { Copy, Heading, Title } from "@/components/text";
import { mobileApi } from "@/lib/api";

type FeedData = Awaited<ReturnType<typeof mobileApi.getFeed>>;

export default function FeedScreen() {
  const [data, setData] = useState<FeedData | null>(null);

  useEffect(() => {
    mobileApi.getFeed().then(setData).catch(() => setData(null));
  }, []);

  return (
    <Screen>
      <Heading>Feed</Heading>
      {data?.items.length ? data.items.map((item) => (
        <Card key={item.id}>
          <Title>{item.user.name}</Title>
          <Copy>{item.meta}</Copy>
          <Copy>{item.text}</Copy>
        </Card>
      )) : <Card><Copy>No friend activity yet.</Copy></Card>}
    </Screen>
  );
}