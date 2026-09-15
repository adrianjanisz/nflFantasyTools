import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My NFL Rankings",
  description: "A personal, editable fantasy football rankings board.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <Script id="remove-bitdefender-marker" strategy="beforeInteractive">
          {`(() => {
            const attribute = "bis_skin_checked";
            const removeMarkers = (root) => {
              if (root instanceof Element && root.hasAttribute(attribute)) root.removeAttribute(attribute);
              if (root.querySelectorAll) root.querySelectorAll("[bis_skin_checked]").forEach((element) => element.removeAttribute(attribute));
            };
            removeMarkers(document);
            new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                if (mutation.type === "attributes") removeMarkers(mutation.target);
                for (const node of mutation.addedNodes) removeMarkers(node);
              }
            }).observe(document.documentElement, { attributes: true, attributeFilter: [attribute], childList: true, subtree: true });
          })();`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
