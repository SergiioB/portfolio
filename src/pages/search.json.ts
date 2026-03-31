import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts");
  const publishedPosts = posts.filter((post) => !post.data.draft);

  const searchIndex = publishedPosts.map((post) => ({
    title: post.data.title,
    description: post.data.description,
    url: `/posts/${post.id}/`,
    category: post.data.category,
    tags: post.data.tags || [],
    date: post.data.pubDate.toISOString().split("T")[0],
  }));

  return new Response(JSON.stringify(searchIndex), {
    headers: {
      "Content-Type": "application/json",
    },
  });
};
