interface IdentifyCandidate {
  work: string
  character: string
}

interface IdentifyCharacter {
  box: [number, number, number, number]
  boxId: string
  notConfident: boolean
  candidates: IdentifyCandidate[]
}

interface IdentifyWorkMatch {
  work: string
  galgames: GalgameCard[]
}

interface IdentifyResult {
  ai: boolean
  traceId: string
  model: string
  characters: IdentifyCharacter[]
  works: IdentifyWorkMatch[]
  workSearchFailed?: boolean
}
