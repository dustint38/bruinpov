import { supabase } from './supabase.js';

// Generate a temporary user ID that persists for the session
export function getUserId() {
  let userId = sessionStorage.getItem('bruinpov_user_id');
  if (!userId) {
    userId = crypto.randomUUID();
    sessionStorage.setItem('bruinpov_user_id', userId);
  }
  return userId;
}

// Returns 'upvote', 'downvote', or null for a given user + memory
export async function getUserVote(memoryId, userId) {
  const { data, error } = await supabase
    .from('likes')
    .select('vote_type')
    .eq('memory_id', memoryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error getting vote:', error);
    return null;
  }

  return data ? data.vote_type : null;
}

// Cast or remove a vote — voteType is 'upvote' or 'downvote'
export async function castVote(memoryId, userId, voteType) {
  const existingVote = await getUserVote(memoryId, userId);

  if (existingVote === voteType) {
    // Same button clicked again → remove vote
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('memory_id', memoryId)
      .eq('user_id', userId);

    if (error) { console.error('Error removing vote:', error); return null; }

    console.log('🗳️ Vote removed');
    return { vote: null };

  } else if (existingVote) {
    // Switching from upvote to downvote or vice versa → update
    const { error } = await supabase
      .from('likes')
      .update({ vote_type: voteType })
      .eq('memory_id', memoryId)
      .eq('user_id', userId);

    if (error) { console.error('Error switching vote:', error); return null; }

    console.log(`🔄 Vote switched to ${voteType}`);
    return { vote: voteType };

  } else {
    // No existing vote → insert new one
    const { error } = await supabase
      .from('likes')
      .insert({ memory_id: memoryId, user_id: userId, vote_type: voteType });

    if (error) { console.error('Error casting vote:', error); return null; }

    console.log(`✅ ${voteType} cast`);
    return { vote: voteType };
  }
}

// Get upvote and downvote counts for a memory
export async function getVoteCounts(memoryId) {
  const { data, error } = await supabase
    .from('likes')
    .select('vote_type')
    .eq('memory_id', memoryId);

  if (error) {
    console.error('Error getting vote counts:', error);
    return { upvotes: 0, downvotes: 0, score: 0 };
  }

  const upvotes = data.filter(r => r.vote_type === 'upvote').length;
  const downvotes = data.filter(r => r.vote_type === 'downvote').length;

  return {
    upvotes,
    downvotes,
    score: upvotes - downvotes  // net score like Reddit
  };
}

// Get everything in one call — counts + what the current user voted
export async function getVoteStatus(memoryId, userId) {
  const [counts, userVote] = await Promise.all([
    getVoteCounts(memoryId),
    getUserVote(memoryId, userId)
  ]);

  return { ...counts, userVote };
}