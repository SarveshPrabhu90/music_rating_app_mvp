import { RecommendationsList } from "@/components/recommendations-list";

export default function RecommendationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Recommendations</h1>
      <p className="text-sm text-zinc-600">Recommendations from what you love, not just what you loop.</p>
      <RecommendationsList />
    </div>
  );
}
