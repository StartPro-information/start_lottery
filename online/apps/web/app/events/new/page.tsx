import { Suspense } from "react";
import SetupForm from "./setup-form";

export const metadata = {
  title: "创建活动"
};


export default function NewEventPage() {
  return (
    <div className="page page-host setup-page">
      <main className="setup-shell">
        <Suspense fallback={null}>
          <SetupForm />
        </Suspense>
      </main>
    </div>
  );
}


