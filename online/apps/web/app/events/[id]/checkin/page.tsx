import CheckinClient from "./checkin-client";

export const metadata = {
  title: "扫码签到"
};


export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="page page-host checkin-page">
      <main className="checkin-shell">
        <header className="checkin-header">
          <h1>扫码签到</h1>
          <p>使用工号 / 邮箱 / 账号完成签到</p>
        </header>
        <CheckinClient eventId={id} />
      </main>
    </div>
  );
}


