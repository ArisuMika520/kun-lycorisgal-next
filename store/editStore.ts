import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CreatePatchData {
  name: string
  introduction: string
  vndbId: string
  dlsiteId: string
  alias: string[]
  tag: string[]
  released: string
  contentLimit: string
  gameCG: (string | { file: File, id: string, preview: string })[]
  gameLink: { name: string, link: string }[]
  developers: string[]
}

export interface CreatePatchRequestData extends CreatePatchData {
  banner: Blob | null
}

interface StoreState {
  data: CreatePatchData
  getData: () => CreatePatchData
  setData: (data: CreatePatchData) => void
  resetData: () => void
}

const initialState: CreatePatchData = {
  name: '',
  introduction: '',
  vndbId: '',
  dlsiteId: '',
  alias: [],
  tag: [],
  released: '',
  contentLimit: 'sfw',
  gameCG: [],
  gameLink: [],
  developers: []
}

export const useCreatePatchStore = create<StoreState>()(
  persist(
    (set, get) => ({
      data: initialState,
      getData: () => get().data,
      setData: (data: CreatePatchData) => set({ data }),
      resetData: () => set({ data: initialState })
    }),
    {
      name: 'kun-patch-edit-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // 确保所有字段都存在，合并默认值
        if (persistedState && typeof persistedState === 'object') {
          return {
            ...persistedState,
            data: {
              ...initialState,
              ...persistedState.data
            }
          }
        }
        return persistedState
      }
    }
  )
)
