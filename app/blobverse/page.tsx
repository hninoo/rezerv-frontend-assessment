import type { Metadata } from "next";

import { BlobverseExperience } from "@/features/blobverse/BlobverseExperience";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
const title = "BLOBVERSE - 3,333 on-chain blobs";
const description =
  "Enter the BLOBVERSE: a loud little universe of 3,333 hand-drawn generative blobs with scroll-driven Three.js motion, pop interactions, and reusable table work.";
const previewImage = "/images/purple16.webp";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: "/blobverse"
  },
  openGraph: {
    title,
    description,
    url: "/blobverse",
    type: "website",
    siteName: "BLOBVERSE",
    locale: "en_US",
    images: [
      {
        url: previewImage,
        width: 512,
        height: 512,
        alt: "BLOBVERSE purple blob mark"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [previewImage]
  }
};

export default function BlobverseReviewPage() {
  return <BlobverseExperience />;
}
