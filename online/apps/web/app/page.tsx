import Link from "next/link";

export const metadata = {
  title: "开源抽奖系统"
};


export default function Home() {
  return (
    <div className="page page-host home-entry">
      <main className="home-entry-shell">
        <div className="home-entry-title">开源抽奖系统</div>
        <p className="home-entry-note">
          本系统创建的抽奖活动数据，仅保留 7 天，7 天后自动删除本次创建的活动数据，包括抽奖人员名单、奖品设置、中奖名单等。
        </p>
        <Link className="home-entry-btn" href="/events/new/guide">
          创建抽奖活动
        </Link>
      </main>
    </div>
  );
}


