import type { Metadata } from "next";
import { Fraunces, Spline_Sans } from "next/font/google";
import "./globals.css";
import "./setup.css";
import "./host.css";
import "./checkin.css";
import "./results.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const body = Spline_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "开源抽奖系统",
    template: "%s",
  },
  description: "Open source lottery system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <div className="dev-credit">
          本系统由深圳市元兴信息技术有限公司开发（中国/深圳） · Developed by StartPro Information Technology Co., Ltd. (Shenzhen,
          China).
        </div>
        {children}
      </body>
    </html>
  );
}
