import { fetchNextMoeMetadata } from './api/nextmoe';

export async function fetchGameMetadata(vndbId: string) {
    return fetchNextMoeMetadata(vndbId);
}
