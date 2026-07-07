"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FileText, Plus, Sparkles, Trash2, Eye, EyeOff, Calendar, Tag, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  tags: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function BlogDashboard() {
  const params = useParams();
  const websiteId = params.id as string;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [toast, setToast] = useState("");

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/posts?websiteId=${websiteId}`);
      const data = await res.json();
      if (res.ok) setPosts(data.posts);
      else setError(data.error || "Failed to load posts");
    } catch {
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (websiteId) fetchPosts(); }, [websiteId]);

  const generatePosts = async (count: number = 3) => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, count }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Generated ${data.posts.length} blog posts!`);
        fetchPosts();
      } else {
        setError(data.error || "Generation failed");
      }
    } catch {
      setError("Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const updatePost = async () => {
    if (!editingPost) return;
    try {
      const res = await fetch("/api/blog/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: editingPost.id,
          title: editTitle,
          content: editContent,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Post updated!");
        setEditingPost(null);
        fetchPosts();
      } else {
        setError(data.error || "Update failed");
      }
    } catch {
      setError("Update failed");
    }
  };

  const toggleStatus = async (post: BlogPost) => {
    const newStatus = post.status === "published" ? "draft" : "published";
    try {
      const res = await fetch("/api/blog/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, status: newStatus }),
      });
      if (res.ok) {
        showToast(newStatus === "published" ? "Post published!" : "Post saved as draft");
        fetchPosts();
      }
    } catch {
      setError("Status change failed");
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    try {
      const res = await fetch("/api/blog/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
      if (res.ok) {
        showToast("Post deleted");
        fetchPosts();
      }
    } catch {
      setError("Delete failed");
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  if (editingPost) {
    return (
      <div className="space-y-6">
        <button onClick={() => setEditingPost(null)} className="flex items-center gap-1.5 text-sm text-indigo-600 font-semibold hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to posts
        </button>
        <div>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full text-2xl font-extrabold text-gray-900 bg-transparent border-b border-gray-200 pb-2 outline-none focus:border-indigo-300"
          />
        </div>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="w-full h-[500px] rounded-2xl bg-white border border-gray-200 p-6 text-sm leading-relaxed outline-none focus:border-indigo-300 font-mono resize-y"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={updatePost}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all"
          >
            Save Changes
          </button>
          <button
            onClick={() => setEditingPost(null)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-fade-up">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h1 className="font-heading text-2xl font-extrabold text-gray-900">Blog Posts</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Generate and manage SEO-optimized blog posts for your site
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => generatePosts(1)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 transition-all disabled:opacity-50 shadow-md"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate 1
          </button>
          <button
            onClick={() => generatePosts(3)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 transition-all disabled:opacity-50 shadow-md"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate 3
          </button>
          <button
            onClick={() => generatePosts(5)}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:brightness-110 transition-all disabled:opacity-50 shadow-md"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Generate 5
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <FileText className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <h2 className="font-heading text-xl font-bold text-gray-900 mb-2">No blog posts yet</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Generate AI-powered blog posts to boost your SEO and engage your audience
          </p>
          <button
            onClick={() => generatePosts(3)}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 shadow-md hover:brightness-110 transition-all disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Generate Posts
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold ${
                      post.status === "published"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                    }`}>
                      {post.status === "published" ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                      {post.status}
                    </span>
                    {post.tags && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold bg-gray-50 text-gray-500">
                        <Tag className="h-2.5 w-2.5" />
                        {post.tags.split(",")[0]}
                      </span>
                    )}
                  </div>
                  <h3
                    className="font-heading text-base font-bold text-gray-900 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                    onClick={() => { setEditingPost(post); setEditTitle(post.title); setEditContent(post.content); }}
                  >
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-1">{post.excerpt}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[10.5px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(post.createdAt)}
                    </span>
                    {post.content && (
                      <span>{post.content.split(/\s+/).length} words</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingPost(post); setEditTitle(post.title); setEditContent(post.content); }}
                    className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleStatus(post)}
                    className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                  >
                    {post.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}