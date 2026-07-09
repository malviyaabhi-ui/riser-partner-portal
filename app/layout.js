import "./globals.css";

export const metadata = {
  title: "Riser Partner Portal",
  description: "Pricing, documents, quotes and support for Riser Technologies partners."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
