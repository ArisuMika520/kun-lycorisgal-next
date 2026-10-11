'use client'

import localforage from 'localforage'
import type { CreatePatchData } from '~/store/editStore'

const GAME_CG_KEY = 'kun-patch-cgs'

type GameCGItem = CreatePatchData['gameCG'][number]
type GameCGFile = Extract<GameCGItem, { file: File }>

type PersistedGameCG = {
  id: string
  name: string
  type: string
  blob: Blob
}

let writeChain: Promise<void> = Promise.resolve()

const enqueueWrite = (task: () => Promise<void>) => {
  const run = writeChain.then(task, task)
  writeChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

const toPersisted = (items: GameCGItem[]): PersistedGameCG[] => {
  const persisted: PersistedGameCG[] = []
  for (const item of items) {
    if (typeof item === 'string') continue
    persisted.push({
      id: item.id,
      name: item.file.name,
      type: item.file.type,
      blob: item.file
    })
  }
  return persisted
}

export const saveGameCGFiles = (items: GameCGItem[]) => {
  const persisted = toPersisted(items ?? [])
  return enqueueWrite(async () => {
    if (persisted.length === 0) {
      await localforage.removeItem(GAME_CG_KEY)
      return
    }
    await localforage.setItem(GAME_CG_KEY, persisted)
  })
}

export const loadGameCGFiles = async (): Promise<GameCGFile[]> => {
  const stored = await localforage.getItem<unknown>(GAME_CG_KEY)
  if (!Array.isArray(stored)) return []

  const files: GameCGFile[] = []
  for (const item of stored) {
    if (!item || typeof item !== 'object') continue
    if (!('id' in item) || !('blob' in item)) continue
    const id = item.id
    const blob = item.blob
    if (typeof id !== 'string' || !(blob instanceof Blob)) continue
    const name =
      'name' in item && typeof item.name === 'string' && item.name
        ? item.name
        : 'cg.webp'
    const type =
      'type' in item && typeof item.type === 'string' && item.type
        ? item.type
        : blob.type || 'image/webp'
    const file = new File([blob], name, { type })
    files.push({
      file,
      id,
      preview: URL.createObjectURL(file)
    })
  }
  return files
}

export const clearGameCGFiles = () =>
  enqueueWrite(async () => {
    await localforage.removeItem(GAME_CG_KEY)
  })
