import "./globals.css";

export const metadata = {
  title: "PR Flash",
  description: "Turn diff and context into a ready-to-use PR description.",
  metadataBase: new URL("http://localhost:3000")
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}