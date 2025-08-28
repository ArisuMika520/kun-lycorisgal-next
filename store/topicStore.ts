import { create } from 'zustand'

export interface CreateTopicData {
  title: string
  content: string
}

interface CreateTopicStore {
  data: CreateTopicData
  setData: (data: CreateTopicData) => void
  getData: () => CreateTopicData
  resetData: () => void
}

const initialData: CreateTopicData = {
  title: '',
  content: ''
}

export const useCreateTopicStore = create<CreateTopicStore>()((set, get) => ({
  data: initialData,
  setData: (data: CreateTopicData) => set({ data }),
  getData: () => get().data,
  resetData: () => set({ data: initialData })
}))