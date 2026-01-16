import Link from "next/link";
import PrizesClient from "./prizes-client";

export const metadata = {
  title: "奖品池",
};

export default async function PrizesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="page page-public">
      <main className="shell">
        <nav className="nav">
          <div className="brand">
            <span className="brand-mark">OL</span>
            Open Lottery
          </div>
          <div className="nav-links">
            <Link href="/">首页</Link>
            <Link href="/events/new/guide">创建活动</Link>
            <Link href={`/events/${id}/participants`}>导入名单</Link>
            <span>配置奖品</span>
          </div>
        </nav>

        <section className="hero">
          <span className="label">Step 03</span>
          <h1 className="hero-title">配置奖品池</h1>
          <p className="hero-sub">按奖品等级配置数量与抽取顺序，确认后即可进入主持台。</p>
          <div className="cta-row">
            <Link className="btn btn-ghost" href={`/events/${id}/host`}>
              进入主持台
            </Link>
          </div>
        </section>

        <h2 className="section-title">奖品配置</h2>
        <PrizesClient eventId={id} />
      </main>
    </div>
  );
}
