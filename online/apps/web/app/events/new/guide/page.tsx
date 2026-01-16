import GuideClient from "./guide-client";

export const metadata = {
  title: "创建活动引导",
};

export default function EventGuidePage() {
  return (
    <div className="page page-host setup-page guide-page">
      <main className="setup-shell guide-shell">
        <GuideClient />
      </main>
    </div>
  );
}
