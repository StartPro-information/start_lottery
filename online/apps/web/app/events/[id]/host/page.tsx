import ConnectionBanner from "../../../components/connection-banner";
import HostStage from "./host-stage";

export const metadata = {
  title: "主持台"
};


export default async function HostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="page page-host">
      <main className="host-shell">
        <ConnectionBanner className="host-connection" />
        <HostStage eventId={id} />
      </main>
    </div>
  );
}


