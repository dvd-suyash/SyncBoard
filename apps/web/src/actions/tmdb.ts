'use server';

export async function searchMovies(query: string) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error('TMDB API Key is not configured on the server.');
  }

  try {
    const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=1`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Failed to fetch from TMDB');
    }
    const data = await res.json();
    return data.results ? data.results.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv') : [];
  } catch (error) {
    console.error('TMDB Search Error:', error);
    throw new Error('Failed to search movies');
  }
}

export async function getTvShowDetails(tvId: string) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB API Key missing');
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tvId}?api_key=${apiKey}&language=en-US`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('TMDB getTvShowDetails Error:', error);
    return null;
  }
}

export async function getTvSeason(tvId: string, seasonNumber: number) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB API Key missing');
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/season/${seasonNumber}?api_key=${apiKey}&language=en-US`);
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('TMDB getTvSeason Error:', error);
    return null;
  }
}
