import ResultsClient from "./results-client";

export const metadata = {
  title: "获奖结果",
};

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="page page-host results-page">
      <main className="results-shell">
        <ResultsClient eventId={id} />
      </main>
    </div>
  );
}
