-- Create function for semantic similarity search of chat messages
-- Uses pgvector's cosine similarity to find related conversations

CREATE OR REPLACE FUNCTION public.match_messages(
    query_embedding VECTOR(768),
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 5,
    session_filter UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    session_id UUID,
    role TEXT,
    content TEXT,
    similarity FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        chat_messages.id,
        chat_messages.session_id,
        chat_messages.role,
        chat_messages.content,
        1 - (chat_messages.embedding <=> query_embedding) AS similarity,
        chat_messages.created_at
    FROM public.chat_messages
    INNER JOIN public.chat_sessions ON chat_sessions.id = chat_messages.session_id
    WHERE 
        chat_sessions.user_id = auth.uid() -- RLS: only user's own messages
        AND chat_messages.embedding IS NOT NULL
        AND 1 - (chat_messages.embedding <=> query_embedding) > match_threshold
        AND (session_filter IS NULL OR chat_messages.session_id = session_filter)
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.match_messages TO authenticated;
