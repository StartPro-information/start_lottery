import ConnectionBanner from "../../../components/connection-banner";
import CheckinPanel from "./checkin-panel";
import RollingList from "./rolling-list";

export const metadata = {
  title: "签到大屏",
};

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_OPEN_API_BASE_URL || "http://localhost:3001";
}

function getTenantId() {
  return process.env.NEXT_PUBLIC_TENANT_ID || "";
}

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const headers: Record<string, string> = {};
  const tenantId = getTenantId();
  if (tenantId) {
    headers["X-Tenant-Id"] = tenantId;
  }
  const res = await fetch(`${getBaseUrl()}/events/${id}`, {
    headers,
    cache: "no-store",
  });
  const data = res.ok ? await res.json() : null;
  const eventName = data?.name || "活动名称";
  return (
    <div className="page page-host screen-page">
      <main className="screen-shell">
        <div className="screen-top">
          <div className="screen-header">
            <h1 className="screen-heading">{eventName}</h1>
          </div>
          <ConnectionBanner className="screen-connection" />
          <div className="screen-actions">
            <a
              className="btn btn-ghost btn-small screen-link"
              href={`/events/new?edit=${id}`}
              target="_blank"
              rel="noreferrer"
            >
              编辑活动内容 ↗
            </a>
            <a
              className="btn btn-ghost btn-small screen-link"
              href={`/events/${id}/host`}
              target="_blank"
              rel="noreferrer"
            >
              进入主持台 ↗
            </a>
          </div>
        </div>
        <section className="screen-block screen-block--qr">
          <h1 className="screen-title">签到二维码</h1>
          <CheckinPanel eventId={id} />
        </section>
        <section className="screen-block screen-block--list">
          <h1 className="screen-title">已签到名单</h1>
          <RollingList eventId={id} />
        </section>
      </main>
    </div>
  );
}
