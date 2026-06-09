import { useState } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

const REACTION_ICONS = { like: '👍', helpful: '💡', bookmark: '🔖' };

function timeAgo(dateStr) {
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#4f46e5,#06b6d4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: size * 0.36 }}>
      {name?.[0] ?? '?'}
    </div>
  );
}

// ── Create Post Modal ────────────────────────────────────────────────────────
function CreatePostModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [body, setBody]   = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/posts', { title, body }),
    onSuccess: () => { onSuccess(); onClose(); },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
                    padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Create Post</h2>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What do you want to discuss?"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                       fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Body *</label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Share your question, tip, or experience…" rows={5}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0',
                       fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                       lineHeight: 1.6, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 11, borderRadius: 8, border: '1px solid #e2e8f0',
                     background: '#f1f5f9', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>
            Cancel
          </button>
          <button onClick={() => mutation.mutate()}
            disabled={mutation.isPending || title.trim().length < 5 || body.trim().length < 10}
            style={{ flex: 2, padding: 11, borderRadius: 8, border: 'none',
                     background: title.trim().length >= 5 && body.trim().length >= 10 ? '#4f46e5' : '#cbd5e1',
                     color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
            {mutation.isPending ? 'Posting…' : 'Post →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Replies Thread ───────────────────────────────────────────────────────────
function RepliesThread({ postId }) {
  const [reply, setReply] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['post-replies', postId],
    queryFn: () => api.get(`/posts/${postId}/replies`).then(r => r.data),
  });

  const replyMutation = useMutation({
    mutationFn: () => api.post(`/posts/${postId}/replies`, { body: reply }),
    onSuccess: () => { setReply(''); queryClient.invalidateQueries(['post-replies', postId]); },
  });

  const replies = data?.replies || [];

  return (
    <div style={{ borderTop: '1px solid #f1f5f9', padding: '14px 20px', background: '#fafbff' }}>
      {isLoading ? (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>Loading replies…</p>
      ) : replies.length === 0 ? (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 12px' }}>No replies yet — be first!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {replies.map(r => (
            <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar name={r.user?.name} size={28} />
              <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 12px',
                            border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{r.user?.name}</span>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(r.createdAt)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{r.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={reply} onChange={e => setReply(e.target.value)}
          placeholder="Write a reply…"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && reply.trim()) { e.preventDefault(); replyMutation.mutate(); } }}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
                   fontSize: 13, outline: 'none' }} />
        <button onClick={() => replyMutation.mutate()}
          disabled={replyMutation.isPending || !reply.trim()}
          style={{ padding: '8px 14px', borderRadius: 8, border: 'none',
                   background: reply.trim() ? '#4f46e5' : '#cbd5e1',
                   color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Reply
        </button>
      </div>
    </div>
  );
}

// ── Post Detail Modal ─────────────────────────────────────────────────────────
function PostDetailModal({ post, onClose }) {
  const queryClient = useQueryClient();

  const reactMutation = useMutation({
    mutationFn: (type) => api.post(`/posts/${post.id}/react`, { type }),
    onSuccess: () => queryClient.invalidateQueries(['community-posts']),
  });

  const myReactions = (post.reactions || []).map(r => r.type);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640,
                    maxHeight: '85vh', display: 'flex', flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Avatar name={post.user?.name} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{post.user?.name}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(post.createdAt)}</span>
                {post.isPinned && (
                  <span style={{ padding: '1px 7px', background: '#fef3c7', borderRadius: 99,
                                 fontSize: 11, fontWeight: 600, color: '#92400e' }}>📌 Pinned</span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#94a3b8' }}>
                <span>👁️ {post.viewCount ?? 0} views</span>
                <span>💬 {post._count?.replies ?? 0} replies</span>
                <span>👍 {post._count?.reactions ?? 0} reactions</span>
              </div>
            </div>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8',
                       cursor: 'pointer', flexShrink: 0 }}>✕</button>
          </div>
          <h2 style={{ margin: '14px 0 0', fontSize: 18, fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
            {post.title}
          </h2>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#374151', lineHeight: 1.7,
                      whiteSpace: 'pre-wrap' }}>
            {post.body}
          </p>

          {/* Reactions */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
            {Object.entries(REACTION_ICONS).map(([type, icon]) => {
              const active = myReactions.includes(type);
              return (
                <button key={type} onClick={() => reactMutation.mutate(type)}
                  style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                           background: active ? '#e0e7ff' : '#f1f5f9',
                           color: active ? '#4f46e5' : '#64748b',
                           fontSize: 13, fontWeight: active ? 700 : 400, transition: '.15s' }}>
                  {icon} {active ? 'Liked' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Replies inline */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
              Replies
            </div>
            <RepliesThread postId={post.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, onOpenDetail }) {
  const [showReplies, setShowReplies] = useState(false);
  const queryClient = useQueryClient();

  const reactMutation = useMutation({
    mutationFn: (type) => api.post(`/posts/${post.id}/react`, { type }),
    onSuccess: () => queryClient.invalidateQueries(['community-posts']),
  });

  const myReactions = (post.reactions || []).map(r => r.type);

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0',
                  boxShadow: post.isPinned ? '0 2px 8px rgba(79,70,229,.12)' : '0 1px 3px rgba(0,0,0,.05)',
                  overflow: 'hidden',
                  borderLeft: post.isPinned ? '3px solid #4f46e5' : '3px solid transparent' }}>

      {/* Pinned banner */}
      {post.isPinned && (
        <div style={{ padding: '5px 20px', background: '#e0e7ff', fontSize: 11,
                      fontWeight: 700, color: '#3730a3', display: 'flex', alignItems: 'center', gap: 4 }}>
          📌 Pinned post
        </div>
      )}

      <div style={{ padding: '16px 20px 10px' }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Avatar name={post.user?.name} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{post.user?.name}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{timeAgo(post.createdAt)}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, fontSize: 11, color: '#94a3b8' }}>
            <span>👁️ {post.viewCount ?? 0}</span>
          </div>
        </div>

        {/* Title — clickable to open detail */}
        <h3
          onClick={() => onOpenDetail(post)}
          style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: '#1e293b',
                   lineHeight: 1.4, cursor: 'pointer' }}
          onMouseEnter={e => e.target.style.color = '#4f46e5'}
          onMouseLeave={e => e.target.style.color = '#1e293b'}>
          {post.title}
        </h3>

        {/* Body preview — click to expand */}
        <p onClick={() => onOpenDetail(post)}
          style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6, cursor: 'pointer',
                   display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {post.body}
        </p>
      </div>

      {/* Actions bar */}
      <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {Object.entries(REACTION_ICONS).map(([type, icon]) => {
          const active = myReactions.includes(type);
          const count = (post.reactionCounts?.[type]) ?? 0;
          return (
            <button key={type} onClick={() => reactMutation.mutate(type)}
              style={{ padding: '5px 10px', borderRadius: 99, border: 'none', cursor: 'pointer',
                       background: active ? '#e0e7ff' : '#f1f5f9',
                       color: active ? '#4f46e5' : '#64748b',
                       fontSize: 12, fontWeight: active ? 700 : 400, transition: '.15s',
                       display: 'flex', alignItems: 'center', gap: 4 }}>
              {icon}{count > 0 && <span>{count}</span>}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <button onClick={() => setShowReplies(v => !v)}
          style={{ padding: '5px 12px', borderRadius: 99, border: '1px solid #e2e8f0',
                   background: showReplies ? '#e0e7ff' : '#fff', cursor: 'pointer',
                   fontSize: 12, fontWeight: 600, color: showReplies ? '#4f46e5' : '#64748b',
                   display: 'flex', alignItems: 'center', gap: 5 }}>
          💬 {post._count?.replies ?? 0} {post._count?.replies === 1 ? 'reply' : 'replies'}
        </button>

        <button onClick={() => onOpenDetail(post)}
          style={{ padding: '5px 12px', borderRadius: 99, border: '1px solid #e2e8f0',
                   background: '#fff', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>
          Read more →
        </button>
      </div>

      {showReplies && <RepliesThread postId={post.id} />}
    </div>
  );
}

// ── Main Community Page ───────────────────────────────────────────────────────
export default function Community() {
  const [showCreate, setShowCreate]       = useState(false);
  const [detailPost, setDetailPost]       = useState(null);
  const [sort, setSort]                   = useState('recent');
  const [search, setSearch]               = useState('');
  const [searchInput, setSearchInput]     = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['community-posts', sort, search],
    queryFn: ({ pageParam }) =>
      api.get('/posts', {
        params: { sort, ...(search ? { search } : {}), ...(pageParam ? { cursor: pageParam } : {}), limit: 15 },
      }).then(r => r.data),
    getNextPageParam: (lastPage) => {
      const posts = lastPage.posts || [];
      return posts.length === 15 ? posts[posts.length - 1].id : undefined;
    },
    initialPageParam: undefined,
  });

  const allPosts = (data?.pages || []).flatMap(p => p.posts || []);
  // Pinned posts float to top
  const posts = [...allPosts.filter(p => p.isPinned), ...allPosts.filter(p => !p.isPinned)];

  const handleSearch = (e) => { e.preventDefault(); setSearch(searchInput); };

  return (
    <div style={{ padding: 28, maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: 0 }}>Community</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            Ask questions, share tips, connect with learners.
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ padding: '10px 20px', background: '#4f46e5', color: '#fff', border: 'none',
                   borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          + New Post
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', background: '#fff', borderRadius: 10,
                      border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {[['recent','🕐 Recent'], ['popular','🔥 Popular']].map(([val, label]) => (
            <button key={val} onClick={() => setSort(val)}
              style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13,
                       fontWeight: 600, background: sort === val ? '#4f46e5' : 'transparent',
                       color: sort === val ? '#fff' : '#64748b' }}>
              {label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 6, minWidth: 200 }}>
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            placeholder="Search posts…"
            style={{ flex: 1, padding: '8px 14px', borderRadius: 10, border: '1px solid #e2e8f0',
                     fontSize: 13, outline: 'none', background: '#fff' }} />
          <button type="submit"
            style={{ padding: '8px 14px', borderRadius: 10, background: '#f1f5f9',
                     border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 13,
                     fontWeight: 600, color: '#475569' }}>
            Search
          </button>
          {search && (
            <button type="button" onClick={() => { setSearch(''); setSearchInput(''); }}
              style={{ padding: '8px 10px', borderRadius: 10, background: 'none',
                       border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Post list */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: '#e2e8f0', borderRadius: 12, height: 120,
                                   animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', background: '#fff',
                      borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>
            {search ? 'No posts match your search' : 'No posts yet'}
          </div>
          <p style={{ color: '#64748b', fontSize: 13 }}>
            {search ? 'Try different keywords.' : 'Be the first to start a discussion!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} onOpenDetail={setDetailPost} />
          ))}
        </div>
      )}

      {/* Load more */}
      {hasNextPage && (
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}
            style={{ padding: '10px 28px', borderRadius: 10, border: '1px solid #e2e8f0',
                     background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4f46e5' }}>
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => queryClient.invalidateQueries(['community-posts'])}
        />
      )}

      {detailPost && (
        <PostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.5} }`}</style>
    </div>
  );
}
