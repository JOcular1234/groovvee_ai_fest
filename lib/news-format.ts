export function formatPostDate(post: {
  publishedAt: Date | null;
  createdAt: Date;
}) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(post.publishedAt ?? post.createdAt);
}

// "generative-ai" → "generative ai" (displayed uppercase by the UI).
export const formatTag = (tag: string) => tag.replace(/-/g, " ");

export const readingTimeLabel = (minutes: number) => `${minutes} min read`;
