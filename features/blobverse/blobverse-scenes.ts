export type BlobverseSceneKind = "opening" | "space" | "return";

export interface BlobverseInteraction {
  hoveringBubble: boolean;
  lastPopAt?: number;
  pointerX?: number;
  pointerY?: number;
  popX?: number;
  popY?: number;
}

export interface BlobverseScene {
  id: string;
  kind: BlobverseSceneKind;
  kicker: string;
  title: string;
  body: string;
  theme: "cream" | "gold" | "night";
}

export const blobverseScenes: BlobverseScene[] = [
  {
    id: "opening-collage",
    kind: "opening",
    kicker: "3,333 on-chain blobs",
    title: "ENTER THE\nBLOBVERSE",
    body: "Meet a strange little universe of hand-drawn blobs, each drifting with its own personality.",
    theme: "cream"
  },
  {
    id: "space-community",
    kind: "space",
    kicker: "The community",
    title: "ONE HUGE,\nCHAOTIC CREW",
    body: "Every blob follows a different orbit, but the whole crew circles the same silly star.",
    theme: "night"
  },
  {
    id: "return-loop",
    kind: "return",
    kicker: "Join us",
    title: "READY TO\nBLOB OUT?",
    body: "Choose the blob that pulls you in, then join the orbit.",
    theme: "night"
  }
];

export const characterTextureUrls = [
  "/blobs/blue1.webp",
  "/blobs/blue2.webp",
  "/blobs/blue3.webp",
  "/blobs/blue4.webp",
  "/blobs/blue5.webp",
  "/blobs/blue6.webp",
  "/blobs/blue7.webp",
  "/blobs/blue8.webp",
  "/blobs/green1.webp",
  "/blobs/green2.webp",
  "/blobs/green3.webp",
  "/blobs/green4.webp",
  "/blobs/green5.webp",
  "/blobs/green6.webp",
  "/blobs/green7.webp",
  "/blobs/green8.webp",
  "/blobs/green9.webp",
  "/blobs/orange1.webp",
  "/blobs/orange2.webp",
  "/blobs/orange3.webp",
  "/blobs/orange4.webp",
  "/blobs/orange5.webp",
  "/blobs/orange6.webp",
  "/blobs/orange7.webp",
  "/blobs/orange8.webp",
  "/blobs/orange9.webp",
  "/blobs/orange10.webp",
  "/blobs/orange11.webp",
  "/blobs/pink1.webp",
  "/blobs/pink2.webp",
  "/blobs/pink3.webp",
  "/blobs/pink4.webp",
  "/blobs/pink5.webp",
  "/blobs/pink6.webp",
  "/blobs/pink7.webp",
  "/blobs/pink8.webp",
  "/blobs/pink9.webp",
  "/blobs/purple1.webp",
  "/blobs/purple2.webp",
  "/blobs/purple3.webp",
  "/blobs/purple4.webp",
  "/blobs/purple5.webp",
  "/blobs/purple6.webp",
  "/blobs/purple7.webp",
  "/blobs/purple8.webp",
  "/blobs/purple9.webp",
  "/blobs/purple10.webp",
  "/blobs/purple11.webp",
  "/blobs/purple12.webp",
  "/blobs/purple13.webp",
  "/blobs/purple14.webp",
  "/blobs/purple15.webp",
  "/blobs/purple16.webp",
  "/blobs/purple17.webp"
] as const;

export const featuredTextureUrls = [
  "/blobs/orange6.webp",
  "/blobs/purple10.webp",
  "/blobs/orange9.webp",
  "/blobs/purple7.webp",
  "/blobs/green3.webp",
  "/blobs/pink4.webp",
  "/blobs/blue8.webp"
] as const;
