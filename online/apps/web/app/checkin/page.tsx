import { Suspense } from "react";
import CheckinClient from "./checkin-client";

export const metadata = {
  title: "签到",
};

export default function CheckinPage() {
  return (
    <Suspense fallback={<div className="page page-host mobile-checkin-page" />}>
      <CheckinClient />
    </Suspense>
  );
}
