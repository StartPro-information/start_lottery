import Link from "next/link";
import ParticipantsClient from "./participants-client";

export const metadata = {
  title: "导入参与者",
};

export default async function ParticipantsPage({
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
            <span>导入名单</span>
          </div>
        </nav>

        <section className="hero">
          <span className="label">Step 02</span>
          <h1 className="hero-title">导入参与者名单</h1>
          <p className="hero-sub">支持 CSV 字段映射，可兼容 AD/LDAP 字段。导入后即可进入奖品配置。</p>
          <div className="cta-row">
            <a className="btn btn-primary" href="/templates/participants-template.csv">
              下载 CSV 模板
            </a>
            <Link className="btn btn-ghost" href={`/events/${id}/prizes`}>
              下一步：配置奖品
            </Link>
          </div>
        </section>

        <h2 className="section-title">字段对照</h2>
        <div className="grid grid-3">
          <div className="card">
            <h3>核心字段</h3>
            <p>display_name, unique_key</p>
          </div>
          <div className="card">
            <h3>组织字段</h3>
            <p>department, title, org_path, custom_field</p>
          </div>
          <div className="card">
            <h3>账号字段</h3>
            <p>employee_id, email, username</p>
          </div>
        </div>

        <h2 className="section-title">导入与预览</h2>
        <ParticipantsClient eventId={id} />
      </main>
    </div>
  );
}
